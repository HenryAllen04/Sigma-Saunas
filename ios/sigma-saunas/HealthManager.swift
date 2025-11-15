import Foundation
import HealthKit
import Combine

class HealthManager: ObservableObject {
    private let healthStore = HKHealthStore()
    private let apiService = APIService.shared
    
    @Published var todaySteps: Int? = nil
    @Published var todayActiveEnergy: Double? = nil      // kcal
    @Published var todayAvgHeartRate: Double? = nil      // bpm
    @Published var authorizationStatus: String = "Not requested"
    @Published var currentWorkoutSession: HKWorkout? = nil
    @Published var loggedSessions: [String] = [] // Track session IDs
    
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
            let heartRateType  = HKObjectType.quantityType(forIdentifier: .heartRate)
        else {
            DispatchQueue.main.async {
                self.authorizationStatus = "Some types unavailable"
            }
            return
        }
        
        let readTypes: Set<HKObjectType> = [stepType, energyType, heartRateType]
        
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
