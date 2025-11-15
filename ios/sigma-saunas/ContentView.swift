import SwiftUI
#if os(iOS)
import UIKit
#endif

struct ContentView: View {
    @EnvironmentObject var healthManager: HealthManager
    @EnvironmentObject var watchConnectivity: WatchConnectivityManager
    @EnvironmentObject var saunaManager: SaunaManager
    @EnvironmentObject var musicManager: MusicManager
    @EnvironmentObject var meditationManager: MeditationManager
    @EnvironmentObject var suggestionEngine: SessionSuggestionEngine
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Sauna Ready Timer
                    saunaReadyTimerSection
                    
                    // Temperature & Humidity
                    temperatureHumiditySection
                    
                    // Start Session / Select Plan
                    if saunaManager.isSessionActive {
                        activeSessionSection
                    } else {
                        sessionControlsSection
                    }
                    
                    // Plan Selection (Meditation, etc.)
                    if !saunaManager.isSessionActive {
                        planSelectionSection
                        
                        // Session History
                        sessionHistorySection
                    }
                    
                    // Additional Info
                    additionalInfoSection
                }
                .padding()
            }
            .navigationTitle("Sigma Saunas")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    // MARK: - Sauna Ready Timer
    
    private var saunaReadyTimerSection: some View {
        VStack(spacing: 16) {
            if saunaManager.isReady {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                    Text("Sauna is Ready!")
                .font(.title.bold())
                        .foregroundColor(.green)
                    Text("Temperature: \(saunaManager.formattedTemperature())")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
                .background(Color.green.opacity(0.1))
                .cornerRadius(16)
            } else {
                VStack(spacing: 12) {
                    Text("Time Until Ready")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text(saunaManager.formattedTimeUntilReady())
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.orange)
                    
                    Text("Target: \(Int(saunaManager.temperatureThreshold))°C")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(16)
            }
        }
    }
    
    // MARK: - Temperature & Humidity
    
    private var temperatureHumiditySection: some View {
        HStack(spacing: 20) {
            // Temperature
            VStack(spacing: 8) {
                Image(systemName: "thermometer")
                    .font(.title2)
                    .foregroundColor(.orange)
                Text("Temperature")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(saunaManager.formattedTemperature())
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.orange)
                Text("°C")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(UIColor.systemGray6))
            .cornerRadius(16)
            
            // Humidity
            VStack(spacing: 8) {
                Image(systemName: "humidity")
                    .font(.title2)
                    .foregroundColor(.blue)
                Text("Humidity")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(saunaManager.formattedHumidity())
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.blue)
                Text("%")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(UIColor.systemGray6))
            .cornerRadius(16)
        }
    }
    
    // MARK: - Session Controls
    
    private var sessionControlsSection: some View {
        VStack(spacing: 16) {
            Button(action: {
                Task {
                    await saunaManager.startSaunaSession()
                }
            }) {
                HStack {
                    Image(systemName: "play.circle.fill")
                        .font(.title2)
                    Text("Start Sauna Session")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(saunaManager.isReady ? Color.green : Color.orange)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
            
            if !saunaManager.isReady {
                Text("Temperature: \(saunaManager.formattedTemperature()) (Ready at \(Int(saunaManager.temperatureThreshold))°C)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
    
    // MARK: - Active Session
    
    private var activeSessionSection: some View {
        VStack(spacing: 16) {
            Text("Session Active")
                .font(.headline)
                .foregroundColor(.green)
            
            Text(saunaManager.formattedSessionElapsedTime())
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(.green)
            
            Button(action: {
                Task {
                    await saunaManager.endSaunaSession()
                }
            }) {
                HStack {
                    Image(systemName: "stop.circle.fill")
                        .font(.title2)
                    Text("End Session")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(16)
    }
    
    // MARK: - Plan Selection
    
    private var planSelectionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Select Plan")
                .font(.headline)
            
            VStack(spacing: 12) {
                // Meditation Plan
                Button(action: {
                    meditationManager.startMeditation(
                        type: meditationManager.meditationType,
                        duration: meditationManager.meditationDuration
                    )
                }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Meditation")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("\(Int(meditationManager.meditationDuration / 60)) min guided session")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(UIColor.systemGray6))
                    .cornerRadius(12)
                }
                
                // Quick Session Plan
                Button(action: {
                    Task {
                        await saunaManager.startSaunaSession()
                    }
                }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Quick Session")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("15 min standard session")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(UIColor.systemGray6))
                    .cornerRadius(12)
                }
                
                // Custom Plan
                NavigationLink(destination: customPlanView) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Custom Plan")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("Configure your own session")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(UIColor.systemGray6))
                    .cornerRadius(12)
                }
            }
        }
    }
    
    private var customPlanView: some View {
        Form {
            Section("Meditation Settings") {
                Picker("Type", selection: $meditationManager.meditationType) {
                    ForEach(MeditationManager.MeditationType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                
                Stepper(value: $meditationManager.meditationDuration, in: 300...3600, step: 60) {
                    Text("Duration: \(Int(meditationManager.meditationDuration / 60)) min")
                }
            }
        }
        .navigationTitle("Custom Plan")
    }
    
    // MARK: - Meditation Status (shown during active session)
    
    @ViewBuilder
    private var meditationStatusSection: some View {
        if meditationManager.isMeditationActive {
            VStack(spacing: 12) {
                Text(meditationManager.meditationType.rawValue)
                    .font(.title3.bold())
                
                Text(meditationManager.formattedRemainingTime())
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.purple)
                
                Text("Elapsed: \(meditationManager.formattedElapsedTime())")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Button("End Meditation") {
                    meditationManager.endMeditation()
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.purple.opacity(0.1))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Music
    
    private var musicSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Music")
                .font(.headline)
            
            VStack(spacing: 12) {
                Toggle("Enable Music", isOn: $musicManager.isMusicEnabled)
                    .onChange(of: musicManager.isMusicEnabled) { enabled in
                        if enabled {
                            musicManager.enableMusic()
                        } else {
                            musicManager.disableMusic()
                        }
                    }
                
                if musicManager.isMusicEnabled {
                    if let track = musicManager.currentTrack {
                        Text("Now Playing: \(track)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        if musicManager.isPlaying {
                            Text(musicManager.formattedElapsedTime())
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    HStack(spacing: 20) {
                        Button(action: { musicManager.previousTrack() }) {
                            Image(systemName: "backward.fill")
                        }
                        .disabled(!musicManager.isMusicEnabled)
                        
                        Button(action: {
                            if musicManager.isPlaying {
                                musicManager.pause()
                            } else {
                                musicManager.play()
                            }
                        }) {
                            Image(systemName: musicManager.isPlaying ? "pause.fill" : "play.fill")
                                .font(.title2)
                        }
                        .disabled(!musicManager.isMusicEnabled)
                        
                        Button(action: { musicManager.nextTrack() }) {
                            Image(systemName: "forward.fill")
                        }
                        .disabled(!musicManager.isMusicEnabled)
                    }
                }
            }
            .padding()
            .background(Color(UIColor.systemGray6))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Watch Section
    
    private var watchSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Watch Data")
                .font(.headline)
            
            if !watchConnectivity.isPaired {
                VStack(spacing: 8) {
                    Image(systemName: "applewatch.side.right")
                        .font(.title2)
                        .foregroundColor(.gray)
                    Text("Watch Not Paired")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("Pair an Apple Watch to see heart rate data")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
            } else if let watchHR = watchConnectivity.watchHeartRate, watchHR > 0 {
                VStack(spacing: 8) {
                    Text("Live Heart Rate")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.0f bpm", watchHR))
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.red)
                    
                    if watchConnectivity.watchWorkoutRunning {
                        Text("Sauna Session Active")
                            .font(.caption)
                            .foregroundColor(.orange)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
            } else {
                VStack(spacing: 8) {
                    Text("No data from Watch")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if watchConnectivity.isReachable {
                        Text("Waiting for heart rate data...")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Watch is not reachable")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Health Data
    
    private var hasHealthData: Bool {
        healthManager.todaySteps != nil ||
        healthManager.todayActiveEnergy != nil ||
        healthManager.todayAvgHeartRate != nil ||
        !healthManager.loggedSessions.isEmpty
    }
    
    @ViewBuilder
    private var healthDataSection: some View {
        if hasHealthData {
            VStack(alignment: .leading, spacing: 12) {
                Text("Today's Activity")
                    .font(.headline)
                
                VStack(spacing: 8) {
                    if let steps = healthManager.todaySteps {
                        HStack {
                            Text("Steps")
                            Spacer()
                            Text("\(steps)")
                                .fontWeight(.semibold)
                        }
                    }

                    if let energy = healthManager.todayActiveEnergy {
                        HStack {
                            Text("Active Energy")
                            Spacer()
                            Text(String(format: "%.0f kcal", energy))
                                .fontWeight(.semibold)
                        }
                    }

                    if let hr = healthManager.todayAvgHeartRate {
                        HStack {
                            Text("Avg Heart Rate")
                            Spacer()
                            Text(String(format: "%.0f bpm", hr))
                                .fontWeight(.semibold)
                        }
                    }
                    
                    if !healthManager.loggedSessions.isEmpty {
                        HStack {
                            Text("Logged Sessions")
                            Spacer()
                            Text("\(healthManager.loggedSessions.count)")
                                .fontWeight(.semibold)
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
                
                Button("Refresh") {
                    healthManager.fetchTodaySteps()
                    healthManager.fetchTodayActiveEnergy()
                    healthManager.fetchTodayAvgHeartRate()
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
            }
        }
    }
    
    // MARK: - Session History
    
    private var sessionHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Session History")
                    .font(.headline)
                Spacer()
                if !saunaManager.sessionHistory.isEmpty {
                    NavigationLink("View All") {
                        sessionHistoryView
                    }
                    .font(.caption)
                }
            }
            
            if saunaManager.sessionHistory.isEmpty {
                Text("No sessions yet")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(UIColor.systemGray6))
                    .cornerRadius(12)
            } else {
                VStack(spacing: 8) {
                    ForEach(Array(saunaManager.sessionHistory.prefix(3).indices), id: \.self) { index in
                        let session = saunaManager.sessionHistory[index]
                        sessionHistoryRow(session)
                    }
                }
                .padding()
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
            }
        }
    }
    
    @ViewBuilder
    private func sessionHistoryRow(_ session: SaunaSessionData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.startTime, style: .date)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                Text(session.startTime, style: .time)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(saunaManager.formattedDuration(session.duration))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                if let temp = session.temperature {
                    Text(String(format: "%.0f°C", temp))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var sessionHistoryView: some View {
        List {
            ForEach(Array(saunaManager.sessionHistory.indices), id: \.self) { index in
                let session = saunaManager.sessionHistory[index]
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(session.startTime, style: .date)
                                .font(.headline)
                            Text(session.startTime, style: .time)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            if let endTime = session.endTime {
                                Text("Ended: \(endTime, style: .time)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(saunaManager.formattedDuration(session.duration))
                                .font(.title3)
                                .fontWeight(.bold)
                            Text("Duration")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    HStack(spacing: 20) {
                        if let temp = session.temperature {
                            Label(String(format: "%.0f°C", temp), systemImage: "thermometer")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        if let humidity = session.humidity {
                            Label(String(format: "%.0f%%", humidity), systemImage: "humidity")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                        
                        if let hr = session.heartRateAvg {
                            Label(String(format: "%.0f bpm", hr), systemImage: "heart.fill")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Session History")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Settings
    
    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Settings")
                .font(.headline)
            
            VStack(spacing: 12) {
                HStack {
                    Text("Temperature Alert")
                    Spacer()
                    Toggle("", isOn: $saunaManager.isThresholdNotificationEnabled)
                }
                
                HStack {
                    Text("Threshold")
                    Spacer()
                    Stepper(value: $saunaManager.temperatureThreshold, in: 60...100, step: 5) {
                        Text(String(format: "%.0f°C", saunaManager.temperatureThreshold))
                            .fontWeight(.semibold)
                    }
                }
                
                Text("Authorization: \(healthManager.authorizationStatus)")
                    .font(.caption)
                    .foregroundColor(.secondary)
        }
        .padding()
            .background(Color(UIColor.systemGray6))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Additional Info
    
    private var additionalInfoSection: some View {
        VStack(spacing: 16) {
            // Meditation status if active
            if meditationManager.isMeditationActive {
                meditationStatusSection
            }
            
            // Music controls
            musicSection
            
            // Watch Connection & Heart Rate
            watchSection
            
            // Health Data
            healthDataSection
            
            // Settings
            settingsSection
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(HealthManager())
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(SaunaManager.shared)
        .environmentObject(MusicManager.shared)
        .environmentObject(MeditationManager.shared)
        .environmentObject(SessionSuggestionEngine.shared)
}
