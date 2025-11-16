import Foundation
import HealthKit
import WatchKit
import Combine   // <-- needed for ObservableObject / @Published

class WorkoutManager: NSObject, ObservableObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    @Published var heartRate: Double? = nil
    @Published var hrv: Double? = nil
    @Published var respiratoryRate: Double? = nil
    @Published var isRunning: Bool = false
    
    private let healthStore = HKHealthStore()
    private let apiService = APIService.shared
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var heartRateTimer: Timer?
    private var wearableDataTimer: Timer?
    private var lastWearableDataSendTime: Date?
    private let minWearableDataSendInterval: TimeInterval = 2.0 // Minimum 2 seconds between sends
    
    @Published var authorizationStatus: HKAuthorizationStatus = .notDetermined
    
    override init() {
        super.init()
        // Don't request authorization on launch - only when user starts workout
        // This prevents blocking app launch
    }
    
    // MARK: - HealthKit Authorization
    
    func requestAuthorizationIfNeeded() {
        guard authorizationStatus == .notDetermined else {
            return // Already authorized or denied
        }
        requestAuthorization()
    }
    
    private func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            return
        }
        
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
              let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
              let respiratoryType = HKObjectType.quantityType(forIdentifier: .respiratoryRate) else {
            return
        }
        
        let typesToShare: Set<HKSampleType> = []
        let typesToRead: Set<HKObjectType> = [heartRateType, hrvType, respiratoryType]
        
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { [weak self] success, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("Health auth error: \(error)")
                    self?.authorizationStatus = .sharingDenied
                } else {
                    print("Health auth success: \(success)")
                    // Check actual authorization status
                    if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) {
                        let status = self?.healthStore.authorizationStatus(for: heartRateType) ?? .notDetermined
                        self?.authorizationStatus = status
                    }
                }
            }
        }
    }
    
    // MARK: - Workout Session
    
    func startWorkout() {
        guard !isRunning else { return }
        
        // Check authorization status first (non-blocking)
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            print("Heart rate type not available")
            return
        }
        
        let authStatus = healthStore.authorizationStatus(for: heartRateType)
        
        // If not authorized, request it asynchronously and continue anyway
        if authStatus == .notDetermined {
            requestAuthorizationIfNeeded()
        }
        
        // Proceed with workout setup asynchronously to avoid blocking
        Task { @MainActor in
            await startWorkoutAsync()
        }
    }
    
    @MainActor
    private func startWorkoutAsync() async {
        let config = HKWorkoutConfiguration()
        config.activityType = .other
        config.locationType = .indoor
        
        // Note: We can't set workout name directly in HKWorkoutConfiguration
        // The name will be set when we save the workout
        
        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            builder = session?.associatedWorkoutBuilder()
        } catch {
            print("Failed to create workout session: \(error)")
            return
        }
        
        guard let session = session, let builder = builder else {
            return
        }
        
        builder.dataSource = HKLiveWorkoutDataSource(
            healthStore: healthStore,
            workoutConfiguration: config
        )
        
        session.delegate = self
        builder.delegate = self
        
        let startDate = Date()
        
        // Set running state AFTER session is created (but before beginCollection)
        // This gives immediate UI feedback while setup continues in background
        self.isRunning = true
        
        // Start activity immediately (non-blocking)
        session.startActivity(with: startDate)
        
        // Begin collection asynchronously (don't wait for completion)
        // This is what causes the 30-second freeze if we wait for it
        builder.beginCollection(withStart: startDate) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("beginCollection error: \(error)")
                    // If collection fails, we might want to stop the workout
                    // but for now, continue anyway
                } else {
                    print("✅ beginCollection completed: success=\(success)")
                }
            }
        }
        
        // Notify iPhone that workout started (non-blocking)
        WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: true)
        
        // Start periodic timer to send heart rate updates
        self.startHeartRateTimer()
        // Start collecting and sending wearable data
        self.startWearableDataCollection()
    }
    
    func endWorkout() {
        guard isRunning else { return }
        
        session?.end()
        builder?.endCollection(withEnd: Date()) { [weak self] success, error in
            self?.builder?.finishWorkout { _, error in
                if let error = error {
                    print("finishWorkout error: \(error)")
                }
            }
        }
        
        DispatchQueue.main.async {
            self.isRunning = false
            self.heartRate = nil
            // Stop periodic timer
            self.stopHeartRateTimer()
            // Stop wearable data collection
            self.stopWearableDataCollection()
            // Notify iPhone that workout ended
            WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: false)
            // Send final wearable data update
            self.sendWearableDataToAPI()
        }
    }
    
    // MARK: - HKWorkoutSessionDelegate
    
    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {
        print("Workout state: \(fromState.rawValue) -> \(toState.rawValue)")
    }
    
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout failed: \(error)")
    }
    
    // MARK: - HKLiveWorkoutBuilderDelegate
    
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Not needed for now
    }
    
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                        didCollectDataOf collectedTypes: Set<HKSampleType>) {
        
        // Update heart rate
        if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
           collectedTypes.contains(heartRateType),
           let stats = workoutBuilder.statistics(for: heartRateType),
           let quantity = stats.mostRecentQuantity() {
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute()) // bpm
            let bpm = quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.heartRate = bpm
                self.performHapticsIfNeeded(bpm: bpm)
                
                // Send heart rate to iPhone via WatchConnectivity
                print("💓 Watch sending heart rate: \(bpm) bpm, workout running: \(self.isRunning)")
                WatchConnectivityManager.shared.sendHeartRate(bpm, isWorkoutRunning: self.isRunning)
                
                // Also send wearable data to API when heart rate updates (real-time)
                print("⌚ [Watch] Heart rate updated during workout - triggering API send")
                self.sendWearableDataToAPI()
            }
        }
        
        // Update HRV if available
        if let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
           collectedTypes.contains(hrvType),
           let stats = workoutBuilder.statistics(for: hrvType),
           let quantity = stats.mostRecentQuantity() {
            
            let unit = HKUnit.secondUnit(with: .milli)
            let hrvMs = quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.hrv = hrvMs
                // Send wearable data to API when HRV updates during workout (real-time)
                if self.isRunning {
                    print("⌚ [Watch] HRV updated during workout - triggering API send")
                    self.sendWearableDataToAPI()
                }
            }
        }
        
        // Update respiratory rate if available
        if let respiratoryType = HKObjectType.quantityType(forIdentifier: .respiratoryRate),
           collectedTypes.contains(respiratoryType),
           let stats = workoutBuilder.statistics(for: respiratoryType),
           let quantity = stats.mostRecentQuantity() {
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let rate = quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.respiratoryRate = rate
                // Send wearable data to API when respiratory rate updates during workout (real-time)
                if self.isRunning {
                    print("⌚ [Watch] Respiratory rate updated during workout - triggering API send")
                    self.sendWearableDataToAPI()
                }
            }
        }
        
        // If we're collecting data but no heart rate yet, still send status update
        if isRunning && heartRate == nil {
            DispatchQueue.main.async {
                print("💓 Watch sending workout status (no HR yet): running = \(self.isRunning)")
                WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: self.isRunning)
            }
        }
    }
    
    // MARK: - Heart Rate Timer
    
    private func startHeartRateTimer() {
        stopHeartRateTimer() // Stop any existing timer
        
        // Send heart rate updates every 2 seconds when workout is running
        heartRateTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isRunning else {
                self?.stopHeartRateTimer()
                return
            }
            
            // Get latest heart rate from builder if available
            if let builder = self.builder,
               let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
               let stats = builder.statistics(for: heartRateType),
               let quantity = stats.mostRecentQuantity() {
                
                let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
                let bpm = quantity.doubleValue(for: unit)
                
                DispatchQueue.main.async {
                    // Only update if we have a valid reading
                    if bpm > 0 {
                        self.heartRate = bpm
                    }
                    // Always send current heart rate (even if 0, to keep connection alive)
                    WatchConnectivityManager.shared.sendHeartRate(self.heartRate ?? 0, isWorkoutRunning: self.isRunning)
                }
            } else {
                // No heart rate data yet, but still send status update
                DispatchQueue.main.async {
                    WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: self.isRunning)
                }
            }
        }
    }
    
    private func stopHeartRateTimer() {
        heartRateTimer?.invalidate()
        heartRateTimer = nil
    }
    
    // MARK: - Wearable Data Collection
    
    func startWearableDataCollection() {
        // Stop any existing timer
        stopWearableDataCollection()
        
        print("⌚ [Watch] Starting wearable data collection during workout - will send data every 10 seconds and on real-time updates")
        
        // Fetch initial HRV and respiratory rate
        fetchCurrentHRV()
        fetchCurrentRespiratoryRate()
        
        // Set up periodic collection and sending (every 10 seconds)
        wearableDataTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isRunning else { return }
            self.fetchCurrentHRV()
            self.fetchCurrentRespiratoryRate()
            self.sendWearableDataToAPI()
        }
    }
    
    func stopWearableDataCollection() {
        wearableDataTimer?.invalidate()
        wearableDataTimer = nil
        print("⌚ [Watch] Stopped wearable data collection")
    }
    
    private func fetchCurrentHRV() {
        guard let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }
        
        // Get the most recent HRV sample (last 30 minutes)
        let endDate = Date()
        let startDate = endDate.addingTimeInterval(-30 * 60)
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictEndDate
        )
        
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        let query = HKSampleQuery(
            sampleType: hrvType,
            predicate: predicate,
            limit: 1,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            guard let self = self, error == nil,
                  let samples = samples as? [HKQuantitySample],
                  let mostRecent = samples.first else {
                DispatchQueue.main.async {
                    self?.hrv = nil
                }
                return
            }
            
            let unit = HKUnit.secondUnit(with: .milli)
            let hrvMs = mostRecent.quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.hrv = hrvMs
            }
        }
        
        healthStore.execute(query)
    }
    
    private func fetchCurrentRespiratoryRate() {
        guard let respiratoryType = HKObjectType.quantityType(forIdentifier: .respiratoryRate) else { return }
        
        // Get the most recent respiratory rate sample (last 30 minutes)
        let endDate = Date()
        let startDate = endDate.addingTimeInterval(-30 * 60)
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictEndDate
        )
        
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        let query = HKSampleQuery(
            sampleType: respiratoryType,
            predicate: predicate,
            limit: 1,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            guard let self = self, error == nil,
                  let samples = samples as? [HKQuantitySample],
                  let mostRecent = samples.first else {
                DispatchQueue.main.async {
                    self?.respiratoryRate = nil
                }
                return
            }
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let rate = mostRecent.quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.respiratoryRate = rate
            }
        }
        
        healthStore.execute(query)
    }
    
    private func sendWearableDataToAPI() {
        // Only send if we have at least one metric
        guard heartRate != nil || hrv != nil || respiratoryRate != nil else {
            return
        }
        
        // Debounce: Don't send more frequently than min interval
        let now = Date()
        if let lastSend = lastWearableDataSendTime,
           now.timeIntervalSince(lastSend) < minWearableDataSendInterval {
            return
        }
        lastWearableDataSendTime = now
        
        let request = WearableDataRequest(
            heartRate: heartRate,
            hrv: hrv,
            respiratoryRate: respiratoryRate
        )
        
        // Log before sending
        let workoutStatus = isRunning ? "Active Workout" : "No Workout"
        let metricsLog = """
        ⌚ [Watch] Sending wearable data to API:
           • Heart Rate (BPM): \(heartRate != nil ? String(format: "%.1f", heartRate!) : "nil")
           • HRV (ms): \(hrv != nil ? String(format: "%.1f", hrv!) : "nil")
           • Respiratory Rate (breaths/min): \(respiratoryRate != nil ? String(format: "%.1f", respiratoryRate!) : "nil")
           • Workout Status: \(workoutStatus)
           • Timestamp: \(DateFormatter.localizedString(from: now, dateStyle: .none, timeStyle: .medium))
        """
        print(metricsLog)
        
        Task {
            do {
                let response = try await apiService.postWearableData(request)
                print("✅ [Watch] Successfully sent wearable data to API")
                print("   Response - Last Updated: \(response.data.lastUpdated?.description ?? "nil")")
            } catch {
                print("❌ [Watch] Failed to send wearable data: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Haptics
    
    private func performHapticsIfNeeded(bpm: Double) {
        // Example: vibrate if HR > 150 bpm
        if bpm > 150 {
            WKInterfaceDevice.current().play(.notification)
        }
    }
}
