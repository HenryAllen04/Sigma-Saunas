import Foundation
import HealthKit
import WatchKit
import Combine   // <-- needed for ObservableObject / @Published

class WorkoutManager: NSObject, ObservableObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    @Published var heartRate: Double? = nil
    @Published var isRunning: Bool = false
    
    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var heartRateTimer: Timer?
    
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
        
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            return
        }
        
        let typesToShare: Set<HKSampleType> = []
        let typesToRead: Set<HKObjectType> = [heartRateType]
        
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
            // Notify iPhone that workout ended
            WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: false)
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
        
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
              collectedTypes.contains(heartRateType) else {
            return
        }
        
        if let stats = workoutBuilder.statistics(for: heartRateType),
           let quantity = stats.mostRecentQuantity() {
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute()) // bpm
            let bpm = quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.heartRate = bpm
                self.performHapticsIfNeeded(bpm: bpm)
                
                // Send heart rate to iPhone via WatchConnectivity
                print("💓 Watch sending heart rate: \(bpm) bpm, workout running: \(self.isRunning)")
                WatchConnectivityManager.shared.sendHeartRate(bpm, isWorkoutRunning: self.isRunning)
            }
        } else {
            // If we're collecting data but no heart rate yet, still send status update
            // This ensures the iPhone knows the workout is running even if HR hasn't been collected yet
            if isRunning {
                DispatchQueue.main.async {
                    print("💓 Watch sending workout status (no HR yet): running = \(self.isRunning)")
                    WatchConnectivityManager.shared.sendHeartRate(0, isWorkoutRunning: self.isRunning)
                }
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
    
    // MARK: - Haptics
    
    private func performHapticsIfNeeded(bpm: Double) {
        // Example: vibrate if HR > 150 bpm
        if bpm > 150 {
            WKInterfaceDevice.current().play(.notification)
        }
    }
}
