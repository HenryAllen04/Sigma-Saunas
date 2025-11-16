import Foundation
import Combine

class SessionSuggestionEngine: ObservableObject {
    static let shared = SessionSuggestionEngine()
    
    @Published var currentSuggestion: SessionSuggestion? = nil
    @Published var isLoading: Bool = false
    
    private let apiService = APIService.shared
    
    init() {}
    
    convenience init(healthManager: HealthManager) {
        self.init()
    }
    
    // MARK: - Generate Suggestions
    
    func generateSuggestion(basedOn caloriesBurned: Double? = nil,
                           workoutType: String? = nil,
                           recoveryDays: Int? = nil) async {
        await MainActor.run {
            isLoading = true
        }
        
        do {
            let suggestion = try await apiService.getSaunaSessionSuggestion(
                caloriesBurned: caloriesBurned,
                workoutType: workoutType,
                recoveryDays: recoveryDays
            )
            
            await MainActor.run {
                currentSuggestion = suggestion
                isLoading = false
            }
        } catch {
            // If API fails, generate local suggestion
            await MainActor.run {
                currentSuggestion = generateLocalSuggestion(
                    caloriesBurned: caloriesBurned,
                    workoutType: workoutType,
                    recoveryDays: recoveryDays
                )
                isLoading = false
            }
        }
    }
    
    // MARK: - Auto-generate from Health Data
    
    func generateFromTodayWorkout(healthManager: HealthManager) async {
        // Get today's active energy
        healthManager.fetchTodayActiveEnergy()
        
        // Wait a bit for the value to be set
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        let calories = healthManager.todayActiveEnergy ?? 0
        
        if calories > 200 {
            await generateSuggestion(
                basedOn: calories,
                workoutType: "general"
            )
        } else {
            // Light day - recovery focused
            await generateSuggestion(
                basedOn: Optional<Double>.none,
                workoutType: nil,
                recoveryDays: 0
            )
        }
    }
    
    // MARK: - Local Suggestion Algorithm
    
    private func generateLocalSuggestion(caloriesBurned: Double? = nil,
                                        workoutType: String? = nil,
                                        recoveryDays: Int? = nil) -> SessionSuggestion {
        var duration: TimeInterval = 15 * 60 // 15 minutes default
        var temperature: Double = 75.0 // 75°C default
        var reason: String = ""
        var basedOn: String = "general"
        
        // High intensity workout
        if let calories = caloriesBurned, calories > 500 {
            duration = 20 * 60 // 20 minutes
            temperature = 80.0 // 80°C
            reason = "You've burned \(Int(calories)) calories today. A longer, warmer session will help with recovery."
            basedOn = "calories"
        }
        // Moderate workout
        else if let calories = caloriesBurned, calories > 200 {
            duration = 15 * 60 // 15 minutes
            temperature = 75.0 // 75°C
            reason = "Based on your \(Int(calories)) calories burned, a moderate session is recommended."
            basedOn = "calories"
        }
        // Recovery day
        else if let recovery = recoveryDays, recovery > 0 {
            duration = 10 * 60 // 10 minutes
            temperature = 70.0 // 70°C
            reason = "After \(recovery) day(s) of rest, a lighter session will help maintain your routine."
            basedOn = "recovery"
        }
        // Light/rest day
        else {
            duration = 12 * 60 // 12 minutes
            temperature = 72.0 // 72°C
            reason = "A light session is perfect for today. Focus on relaxation and recovery."
            basedOn = "general"
        }
        
        // Adjust based on workout type
        if let workout = workoutType?.lowercased() {
            if workout.contains("cardio") || workout.contains("running") {
                temperature = min(temperature + 2, 85.0) // Slightly warmer for cardio
                reason += " Higher temperature for cardio recovery."
            } else if workout.contains("strength") || workout.contains("weight") {
                duration += 5 * 60 // 5 extra minutes for strength training
                reason += " Extended duration for muscle recovery."
            }
        }
        
        return SessionSuggestion(
            recommendedDuration: duration,
            recommendedTemperature: temperature,
            reason: reason,
            basedOn: basedOn
        )
    }
    
    // MARK: - Formatting
    
    func formattedDuration() -> String {
        guard let suggestion = currentSuggestion else { return "N/A" }
        let minutes = Int(suggestion.recommendedDuration) / 60
        return "\(minutes) min"
    }
    
    func formattedTemperature() -> String {
        guard let suggestion = currentSuggestion else { return "N/A" }
        return String(format: "%.0f°C", suggestion.recommendedTemperature)
    }
}

