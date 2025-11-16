import Foundation
import Combine

struct SessionSuggestion {
    let recommendedDuration: TimeInterval // minutes
    let recommendedTemperature: Double
    let reason: String
    let basedOn: String // "workout", "recovery", "calories", etc.
}

class SessionSuggestionManager: ObservableObject {
    static let shared = SessionSuggestionManager()
    
    @Published var currentSuggestion: SessionSuggestion? = nil
    @Published var isLoading: Bool = false
    
    private init() {}
    
    // MARK: - Generate Suggestions
    
    func generateSuggestion(basedOn caloriesBurned: Double? = nil,
                           workoutType: String? = nil,
                           recoveryDays: Int? = nil) async {
        await MainActor.run {
            isLoading = true
        }
        
        // Generate local suggestion (Watch doesn't need API for now)
        await MainActor.run {
            currentSuggestion = generateLocalSuggestion(
                caloriesBurned: caloriesBurned,
                workoutType: workoutType,
                recoveryDays: recoveryDays
            )
            isLoading = false
        }
    }
    
    // MARK: - Auto-generate from Health Data
    
    func generateFromTodayWorkout(healthManager: HealthDataManager) async {
        // Wait a bit for health data to be fetched
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
                basedOn: nil,
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
        var temperature: Double = 80.0 // 80°C default
        var reason: String = "Standard sauna session"
        var basedOn: String = "default"
        
        if let calories = caloriesBurned {
            if calories > 500 {
                duration = 20 * 60 // 20 minutes for intense workout
                temperature = 85.0
                reason = "Intense workout recovery - longer session recommended"
                basedOn = "calories"
            } else if calories > 200 {
                duration = 15 * 60 // 15 minutes for moderate workout
                temperature = 80.0
                reason = "Moderate activity - standard session"
                basedOn = "calories"
            } else {
                duration = 10 * 60 // 10 minutes for light day
                temperature = 75.0
                reason = "Light day - shorter recovery session"
                basedOn = "recovery"
            }
        } else {
            // Recovery day
            duration = 10 * 60
            temperature = 75.0
            reason = "Recovery session - gentle heat"
            basedOn = "recovery"
        }
        
        return SessionSuggestion(
            recommendedDuration: duration,
            recommendedTemperature: temperature,
            reason: reason,
            basedOn: basedOn
        )
    }
    
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

