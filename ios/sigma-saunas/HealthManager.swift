import Foundation
import HealthKit
import Combine

class HealthManager: ObservableObject {
    private let healthStore = HKHealthStore()
    private let apiService = APIService.shared
    
    @Published var todaySteps: Int? = nil
    @Published var todayActiveEnergy: Double? = nil      // kcal
    @Published var todayAvgHeartRate: Double? = nil      // bpm
    @Published var currentHeartRate: Double? = nil       // bpm - current reading
    @Published var currentHRV: Double? = nil             // ms - Heart Rate Variability
    @Published var currentRespiratoryRate: Double? = nil // breaths per minute
    @Published var authorizationStatus: String = "Not requested"
    @Published var currentWorkoutSession: HKWorkout? = nil
    @Published var loggedSessions: [String] = [] // Track session IDs
    
    private var wearableDataTimer: Timer?
    private var lastWearableDataSendTime: Date?
    private let minWearableDataSendInterval: TimeInterval = 2.0 // Minimum 2 seconds between sends
    
    init() {
        // Don't block app launch - defer authorization request
        // UI will appear first, then authorization happens
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds delay
            requestAuthorization()
        }
    }

    private func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            DispatchQueue.main.async {
                self.authorizationStatus = "Health data not available"
            }
            return
        }
        
        guard
            let stepType       = HKObjectType.quantityType(forIdentifier: .stepCount),
            let energyType     = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
            let heartRateType  = HKObjectType.quantityType(forIdentifier: .heartRate),
            let hrvType        = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            let respiratoryType = HKObjectType.quantityType(forIdentifier: .respiratoryRate)
        else {
            DispatchQueue.main.async {
                self.authorizationStatus = "Some types unavailable"
            }
            return
        }
        
        let readTypes: Set<HKObjectType> = [stepType, energyType, heartRateType, hrvType, respiratoryType]
        
        healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    self.authorizationStatus = "Error: \(error.localizedDescription)"
                } else if success {
                    self.authorizationStatus = "Authorized"
                    // Fetch everything once we're authorized
                    self.fetchTodaySteps()
                    self.fetchTodayActiveEnergy()
                    self.fetchTodayAvgHeartRate()
                    // Start monitoring workouts for automatic logging
                    self.startMonitoringWorkouts()
                    // Start collecting and sending wearable data
                    self.startWearableDataCollection()
                } else {
                    self.authorizationStatus = "Not authorized"
                }
            }
        }
    }
    
    // Total active kcal today
    func fetchTodayActiveEnergy() {
        guard let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else { return }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )
        
        let query = HKStatisticsQuery(
            quantityType: energyType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { [weak self] _, result, error in
            guard let self = self else { return }
            
            guard let result = result,
                  let sum = result.sumQuantity(),
                  error == nil else {
                DispatchQueue.main.async {
                    self.todayActiveEnergy = nil
                }
                return
            }
            
            let kcal = sum.doubleValue(for: HKUnit.kilocalorie())
            DispatchQueue.main.async {
                self.todayActiveEnergy = kcal
            }
        }
        
        healthStore.execute(query)
    }

    // Average heart rate today (simple mean of all samples)
    func fetchTodayAvgHeartRate() {
        guard let heartType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )
        
        let query = HKSampleQuery(
            sampleType: heartType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { [weak self] _, samples, error in
            guard let self = self else { return }
            guard error == nil,
                  let samples = samples as? [HKQuantitySample],
                  !samples.isEmpty else {
                DispatchQueue.main.async {
                    self.todayAvgHeartRate = nil
                }
                return
            }
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute()) // bpm
            let sum = samples.reduce(0.0) { partial, sample in
                partial + sample.quantity.doubleValue(for: unit)
            }
            let avg = sum / Double(samples.count)
            
            DispatchQueue.main.async {
                self.todayAvgHeartRate = avg
            }
        }
        
        healthStore.execute(query)
    }

    
    func fetchTodaySteps() {
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )
        
        let query = HKStatisticsQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { [weak self] _, result, error in
            guard let self = self else { return }
            
            guard let result = result,
                  let sum = result.sumQuantity(),
                  error == nil else {
                DispatchQueue.main.async {
                    self.todaySteps = nil
                }
                return
            }
            
            let steps = Int(sum.doubleValue(for: HKUnit.count()))
            DispatchQueue.main.async {
                self.todaySteps = steps
            }
        }
        
        healthStore.execute(query)
    }
    
    // MARK: - Gym Session Logging
    
    func startMonitoringWorkouts() {
        // Monitor for new workout sessions
        let workoutType = HKObjectType.workoutType()
        
        let query = HKObserverQuery(sampleType: workoutType, predicate: nil) { [weak self] query, completionHandler, error in
            guard let self = self, error == nil else {
                completionHandler()
                return
            }
            
            // Fetch recent workouts
            self.fetchRecentWorkouts { workouts in
                for workout in workouts {
                    self.logGymSession(from: workout)
                }
                completionHandler()
            }
        }
        
        healthStore.execute(query)
        healthStore.enableBackgroundDelivery(for: workoutType, frequency: .immediate) { success, error in
            if let error = error {
                print("Background delivery error: \(error.localizedDescription)")
            }
        }
    }
    
    private func fetchRecentWorkouts(completion: @escaping ([HKWorkout]) -> Void) {
        let workoutType = HKObjectType.workoutType()
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )
        
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        let query = HKSampleQuery(
            sampleType: workoutType,
            predicate: predicate,
            limit: 10,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            guard let workouts = samples as? [HKWorkout], error == nil else {
                completion([])
                return
            }
            completion(workouts)
        }
        
        healthStore.execute(query)
    }
    
    func logGymSession(from workout: HKWorkout) {
        let sessionId = workout.uuid.uuidString
        
        // Check if already logged
        if loggedSessions.contains(sessionId) {
            return
        }
        
        // Calculate calories if available
        var calories: Double = 0
        if let totalEnergyBurned = workout.totalEnergyBurned {
            calories = totalEnergyBurned.doubleValue(for: HKUnit.kilocalorie())
        }
        
        // Get heart rate statistics if available
        fetchHeartRateForWorkout(workout: workout) { avgHR, maxHR in
            let sessionData = GymSessionData(
                sessionId: sessionId,
                startTime: workout.startDate,
                endTime: workout.endDate,
                caloriesBurned: calories,
                heartRateAvg: avgHR,
                heartRateMax: maxHR,
                workoutType: workout.workoutActivityType.name,
                duration: workout.duration
            )
            
            Task {
                do {
                    let savedSession = try await self.apiService.createGymSession(sessionData)
                    await MainActor.run {
                        self.loggedSessions.append(sessionId)
                    }
                    print("Gym session logged: \(savedSession.sessionId ?? "unknown")")
                } catch {
                    print("Failed to log gym session: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func fetchHeartRateForWorkout(workout: HKWorkout, completion: @escaping (Double?, Double?) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(nil, nil)
            return
        }
        
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        
        let query = HKSampleQuery(
            sampleType: heartRateType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { _, samples, error in
            guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else {
                completion(nil, nil)
                return
            }
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let heartRates = samples.map { $0.quantity.doubleValue(for: unit) }
            
            let avg = heartRates.reduce(0, +) / Double(heartRates.count)
            let max = heartRates.max()
            
            completion(avg, max)
        }
        
        healthStore.execute(query)
    }
    
    // MARK: - Wearable Data Collection
    
    func startWearableDataCollection() {
        // Stop any existing timer
        stopWearableDataCollection()
        
        print("📱 [iPhone] Starting wearable data collection - will send data every 10 seconds")
        
        // Fetch initial data
        fetchCurrentWearableData()
        
        // Set up periodic collection and sending (every 10 seconds)
        wearableDataTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            self?.fetchCurrentWearableData()
            self?.sendWearableDataToAPI()
        }
    }
    
    func stopWearableDataCollection() {
        wearableDataTimer?.invalidate()
        wearableDataTimer = nil
        print("📱 [iPhone] Stopped wearable data collection")
    }
    
    private func fetchCurrentWearableData() {
        fetchCurrentHeartRate()
        fetchCurrentHRV()
        fetchCurrentRespiratoryRate()
    }
    
    private func fetchCurrentHeartRate() {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }
        
        // Get the most recent heart rate sample (last 5 minutes)
        let endDate = Date()
        let startDate = endDate.addingTimeInterval(-5 * 60)
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictEndDate
        )
        
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        let query = HKSampleQuery(
            sampleType: heartRateType,
            predicate: predicate,
            limit: 1,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            guard let self = self, error == nil,
                  let samples = samples as? [HKQuantitySample],
                  let mostRecent = samples.first else {
                DispatchQueue.main.async {
                    self?.currentHeartRate = nil
                }
                return
            }
            
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let bpm = mostRecent.quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.currentHeartRate = bpm
            }
        }
        
        healthStore.execute(query)
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
                    self?.currentHRV = nil
                }
                return
            }
            
            // HRV is measured in milliseconds
            let unit = HKUnit.secondUnit(with: .milli)
            let hrvMs = mostRecent.quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.currentHRV = hrvMs
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
                    self?.currentRespiratoryRate = nil
                }
                return
            }
            
            // Respiratory rate is measured in breaths per minute
            let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
            let rate = mostRecent.quantity.doubleValue(for: unit)
            
            DispatchQueue.main.async {
                self.currentRespiratoryRate = rate
            }
        }
        
        healthStore.execute(query)
    }
    
    private func sendWearableDataToAPI() {
        // Only send if we have at least one metric
        guard currentHeartRate != nil || currentHRV != nil || currentRespiratoryRate != nil else {
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
            heartRate: currentHeartRate,
            hrv: currentHRV,
            respiratoryRate: currentRespiratoryRate
        )
        
        // Log before sending
        let metricsLog = """
        📱 [iPhone] Sending wearable data to API:
           • Heart Rate (BPM): \(currentHeartRate != nil ? String(format: "%.1f", currentHeartRate!) : "nil")
           • HRV (ms): \(currentHRV != nil ? String(format: "%.1f", currentHRV!) : "nil")
           • Respiratory Rate (breaths/min): \(currentRespiratoryRate != nil ? String(format: "%.1f", currentRespiratoryRate!) : "nil")
           • Timestamp: \(DateFormatter.localizedString(from: now, dateStyle: .none, timeStyle: .medium))
        """
        print(metricsLog)
        
        Task {
            do {
                let response = try await apiService.postWearableData(request)
                print("✅ [iPhone] Successfully sent wearable data to API")
                print("   Response - Last Updated: \(response.data.lastUpdated?.description ?? "nil")")
            } catch {
                print("❌ [iPhone] Failed to send wearable data: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - HKWorkoutActivityType Extension

extension HKWorkoutActivityType {
    var name: String {
        switch self {
        case .traditionalStrengthTraining:
            return "strength_training"
        case .running:
            return "running"
        case .cycling:
            return "cycling"
        case .swimming:
            return "swimming"
        case .walking:
            return "walking"
        case .crossTraining:
            return "cross_training"
        case .yoga:
            return "yoga"
        case .boxing:
            return "boxing"
        default:
            return "other"
        }
    }
}
