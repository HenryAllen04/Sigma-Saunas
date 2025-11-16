import SwiftUI

struct ContentView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var watchConnectivity: WatchConnectivityManager
    @EnvironmentObject var temperatureManager: SaunaTemperatureManager
    @StateObject private var healthManager = HealthDataManager()
    @StateObject private var suggestionManager = SessionSuggestionManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                // Header
                headerSection
                
                // Sauna Ready Timer
                readyTimerSection
                
                // Temperature & Humidity
                temperatureSection
                
                // Workout Controls
                workoutSection
                
                // Health Data Summary
                if hasHealthData {
                    healthDataSection
                }
                
                // Session Suggestion
                if let suggestion = suggestionManager.currentSuggestion {
                    suggestionSection(suggestion)
                }
            }
            .padding(8)
        }
        .onAppear {
            // Fetch health data when view appears
            Task {
                await healthManager.fetchTodayData()
            }
            
            // Debug: Check current temperature
            print("📊 Watch ContentView onAppear - Current temp: \(temperatureManager.currentTemperature ?? 0)°C")
            print("📊 Watch ContentView - WatchConnectivity temp: \(watchConnectivity.temperature ?? 0)°C")
            print("📊 Watch ContentView - WatchConnectivity humidity: \(watchConnectivity.humidity ?? 0)%")
            
            // If we have temperature from WatchConnectivity but not in TemperatureManager, sync it
            if let temp = watchConnectivity.temperature, temperatureManager.currentTemperature == nil {
                print("🔄 Syncing temperature from WatchConnectivity to TemperatureManager")
                temperatureManager.updateTemperature(temp)
            }
        }
        .onChange(of: watchConnectivity.temperature) { oldValue, newValue in
            // When temperature arrives via WatchConnectivity, update the manager
            if let newTemp = newValue {
                print("🔄 onChange detected new temperature: \(newTemp)°C")
                temperatureManager.updateTemperature(newTemp)
            }
        }
        .onChange(of: watchConnectivity.humidity) { oldValue, newValue in
            // Humidity updated
            print("🔄 onChange detected new humidity: \(newValue ?? 0)%")
        }
    }
    
    // MARK: - Header
    
    private var headerSection: some View {
        VStack(spacing: 2) {
            Text("Sauna")
                .font(.system(size: 14, weight: .semibold))
            
            if watchConnectivity.isReachable {
                Text("Connected")
                    .font(.system(size: 10))
                    .foregroundColor(.green)
            }
        }
    }
    
    // MARK: - Ready Timer
    
    private var readyTimerSection: some View {
        VStack(spacing: 3) {
            if temperatureManager.isReady {
                VStack(spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.green)
                    Text("Sauna Ready!")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.green)
                    Text("Temperature: \(temperatureManager.formattedTemperature())")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(Color.green.opacity(0.2))
                .cornerRadius(6)
            } else if let temp = temperatureManager.currentTemperature {
                VStack(spacing: 2) {
                    Text("Time Until Ready")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text(temperatureManager.formattedTimeUntilReady())
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.orange)
                    Text("Current: \(temperatureManager.formattedTemperature())")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text("Target: 80°C")
                        .font(.system(size: 8))
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(Color.orange.opacity(0.2))
                .cornerRadius(6)
            } else {
                // Show waiting state
                VStack(spacing: 2) {
                    Text("Waiting for temperature...")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text("No data yet")
                        .font(.system(size: 8))
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(6)
            }
        }
    }
    
    // MARK: - Temperature
    
    private var temperatureSection: some View {
        VStack(spacing: 4) {
            if let temp = temperatureManager.currentTemperature {
                HStack(spacing: 8) {
                    // Temperature
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 2) {
                            Image(systemName: "thermometer")
                                .font(.system(size: 9))
                            Text("Temperature")
                                .font(.system(size: 9))
                                .foregroundColor(.secondary)
                        }
                        Text(temperatureManager.formattedTemperature())
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(temperatureManager.isReady ? .green : .orange)
                    }
                    
                    if (temperatureManager.currentHumidity ?? watchConnectivity.humidity) != nil {
                        Divider()
                            .frame(height: 20)
                        
                        // Humidity
                        if let humidity = temperatureManager.currentHumidity ?? watchConnectivity.humidity {
                            VStack(alignment: .trailing, spacing: 2) {
                                HStack(spacing: 2) {
                                    Text("Humidity")
                                        .font(.system(size: 9))
                                        .foregroundColor(.secondary)
                                    Image(systemName: "humidity")
                                        .font(.system(size: 9))
                                }
                                Text(String(format: "%.1f%%", humidity))
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } else {
                VStack(spacing: 2) {
                    Text("No Temperature Data")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text("Connect to iPhone")
                        .font(.system(size: 9))
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(6)
        .background(Color.black.opacity(0.1))
        .cornerRadius(6)
    }
    
    // MARK: - Workout
    
    private var workoutSection: some View {
        VStack(spacing: 4) {
            if workoutManager.isRunning {
                VStack(spacing: 2) {
                    if let bpm = workoutManager.heartRate {
                        Text(String(format: "%.0f bpm", bpm))
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.red)
                    } else {
                        Text("Starting...")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    
                    Button("End Session") {
                        workoutManager.endWorkout()
                    }
                    .font(.system(size: 11))
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
            } else {
                Button("Start Workout") {
                    workoutManager.startWorkout()
                }
                .font(.system(size: 11))
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(6)
        .background(Color.black.opacity(0.1))
        .cornerRadius(6)
    }
    
    // MARK: - Health Data
    
    private var hasHealthData: Bool {
        healthManager.todaySteps != nil ||
        healthManager.todayActiveEnergy != nil ||
        healthManager.todayAvgHeartRate != nil
    }
    
    @ViewBuilder
    private var healthDataSection: some View {
        if hasHealthData {
            VStack(alignment: .leading, spacing: 3) {
                Text("Today's Activity")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                
                if let steps = healthManager.todaySteps {
                    HStack {
                        Text("Steps")
                            .font(.system(size: 9))
                        Spacer()
                        Text("\(steps)")
                            .font(.system(size: 10, weight: .semibold))
                    }
                }
                
                if let energy = healthManager.todayActiveEnergy {
                    HStack {
                        Text("Energy")
                            .font(.system(size: 9))
                        Spacer()
                        Text(String(format: "%.0f kcal", energy))
                            .font(.system(size: 10, weight: .semibold))
                    }
                }
                
                Button("Get Suggestion") {
                    Task {
                        await suggestionManager.generateFromTodayWorkout(healthManager: healthManager)
                    }
                }
                .font(.system(size: 9))
                .buttonStyle(.bordered)
            }
            .padding(6)
            .background(Color.black.opacity(0.1))
            .cornerRadius(6)
        }
    }
    
    // MARK: - Suggestion
    
    private func suggestionSection(_ suggestion: SessionSuggestion) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("Recommended")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Duration")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text(suggestionManager.formattedDuration())
                        .font(.system(size: 10, weight: .bold))
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 1) {
                    Text("Temperature")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text(suggestionManager.formattedTemperature())
                        .font(.system(size: 10, weight: .bold))
                }
            }
            
            Text(suggestion.reason)
                .font(.system(size: 8))
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding(6)
        .background(Color.blue.opacity(0.2))
        .cornerRadius(6)
    }
}

#Preview {
    ContentView()
        .environmentObject(WorkoutManager())
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(SaunaTemperatureManager.shared)
}
