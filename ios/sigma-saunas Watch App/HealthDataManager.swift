import Foundation
import HealthKit
import Combine

class HealthDataManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    @Published var todaySteps: Int? = nil
    @Published var todayActiveEnergy: Double? = nil // kcal
    @Published var todayAvgHeartRate: Double? = nil // bpm
    @Published var authorizationStatus: HKAuthorizationStatus = .notDetermined
    
    init() {
        // Don't block app launch
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds delay
            requestAuthorization()
        }
    }
    
    // MARK: - Authorization
    
    private func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            return
        }
        
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!
        ]
        
        healthStore.requestAuthorization(toShare: [], read: typesToRead) { [weak self] success, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("Health auth error: \(error)")
                } else {
                    if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) {
                        self?.authorizationStatus = self?.healthStore.authorizationStatus(for: heartRateType) ?? .notDetermined
                    }
                    if success {
                        Task {
                            await self?.fetchTodayData()
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Fetch Data
    
    func fetchTodayData() async {
        await fetchTodaySteps()
        await fetchTodayActiveEnergy()
        await fetchTodayAvgHeartRate()
    }
    
    @MainActor
    func fetchTodaySteps() async {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] query, result, error in
            guard let result = result, let sum = result.sumQuantity() else {
                return
            }
            
            let steps = Int(sum.doubleValue(for: HKUnit.count()))
            DispatchQueue.main.async {
                self?.todaySteps = steps
            }
        }
        
        healthStore.execute(query)
    }
    
    @MainActor
    func fetchTodayActiveEnergy() async {
        guard let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return }
        
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        let query = HKStatisticsQuery(quantityType: energyType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] query, result, error in
            guard let result = result, let sum = result.sumQuantity() else {
                return
            }
            
            let energy = sum.doubleValue(for: HKUnit.kilocalorie())
            DispatchQueue.main.async {
                self?.todayActiveEnergy = energy
            }
        }
        
        healthStore.execute(query)
    }
    
    @MainActor
    func fetchTodayAvgHeartRate() async {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }
        
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        let query = HKStatisticsQuery(quantityType: hrType, quantitySamplePredicate: predicate, options: .discreteAverage) { [weak self] query, result, error in
            guard let result = result, let avg = result.averageQuantity() else {
                return
            }
            
            let bpm = avg.doubleValue(for: HKUnit.count().unitDivided(by: HKUnit.minute()))
            DispatchQueue.main.async {
                self?.todayAvgHeartRate = bpm
            }
        }
        
        healthStore.execute(query)
    }
}

