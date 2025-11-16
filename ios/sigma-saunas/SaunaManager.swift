import Foundation
import Combine
import UserNotifications

class SaunaManager: ObservableObject {
    static let shared = SaunaManager()
    
    @Published var currentTemperature: Double? = nil
    @Published var currentHumidity: Double? = nil
    @Published var isPresenceDetected: Bool = false
    @Published var temperatureThreshold: Double = 80.0 // Celsius
    @Published var isThresholdNotificationEnabled: Bool = true
    @Published var isSessionActive: Bool = false
    @Published var sessionStartTime: Date? = nil
    @Published var currentSessionId: String? = nil
    @Published var sessionElapsedTime: TimeInterval = 0
    @Published var sessionHistory: [SaunaSessionData] = []
    
    private let apiService = APIService.shared
    private var updateTimer: Timer?
    private var lastUpdateTime: Date?
    private var readyTimer: Timer?
    private var sessionTimer: Timer?
    private var hasNotifiedThreshold: Bool = false
    
    private init() {
        // Don't block app launch - defer heavy operations
        requestNotificationPermission()
        // Don't start API calls immediately - let UI load first
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds delay
            startPeriodicUpdates()
        }
    }
    
    // MARK: - Sensor Data Updates
    
    func startPeriodicUpdates(interval: TimeInterval = 5.0) {
        updateTimer?.invalidate()
        updateTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task {
                await self?.fetchSensorData()
            }
        }
        // Initial fetch
        Task {
            await fetchSensorData()
        }
    }
    
    func stopPeriodicUpdates() {
        updateTimer?.invalidate()
        updateTimer = nil
    }
    
    @MainActor
    func fetchSensorData() async {
        do {
            // Set timeout to prevent hanging
            let sensorData = try await withTimeout(seconds: 5) {
                try await self.apiService.fetchSaunaSensorData()
            }
            currentTemperature = sensorData.temperature
            currentHumidity = sensorData.humidity
            isPresenceDetected = sensorData.presence
            lastUpdateTime = sensorData.timestamp
            
            // Always send temperature to Watch via WatchConnectivity
            print("📤 Sending temperature to Watch: \(sensorData.temperature)°C, Humidity: \(sensorData.humidity ?? 0)%")
            WatchConnectivityManager.shared.sendTemperature(
                sensorData.temperature,
                humidity: sensorData.humidity
            )
            
            // Check temperature threshold and send notification if reached
            if isThresholdNotificationEnabled,
               let temp = currentTemperature {
                // Send notification when threshold is reached (only once)
                if temp >= temperatureThreshold && !hasNotifiedThreshold {
                    hasNotifiedThreshold = true
                    sendTemperatureNotification(temperature: temp)
                    print("🔥 Sauna ready! Sent notification at \(temp)°C")
                } else if temp < temperatureThreshold {
                    // Reset notification flag when temperature drops below threshold
                    hasNotifiedThreshold = false
                }
            }
        } catch {
            print("Failed to fetch sensor data: \(error.localizedDescription)")
            // In development, you might want to use mock data
            #if DEBUG
            useMockData()
            #endif
        }
    }
    
    // Helper to add timeout to async operations
    private func withTimeout<T>(seconds: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw TimeoutError()
            }
            guard let result = try await group.next() else {
                throw TimeoutError()
            }
            group.cancelAll()
            return result
        }
    }
    
    private struct TimeoutError: Error {}
    
    // MARK: - Mock Data for Development
    
    private func useMockData() {
        // Mock sensor data when backend is not available
        let mockTemp = 75.0 + Double.random(in: -5...10)
        let mockHumidity = 30.0 + Double.random(in: -5...15)
        
        DispatchQueue.main.async {
            self.currentTemperature = mockTemp
            self.currentHumidity = mockHumidity
            self.isPresenceDetected = Bool.random()
            self.lastUpdateTime = Date()
        }
        
        // Always send mock temperature to Watch for testing
        WatchConnectivityManager.shared.sendTemperature(mockTemp, humidity: mockHumidity)
        print("📤 Sent mock data to Watch: Temp=\(mockTemp)°C, Humidity=\(mockHumidity)%")
    }
    
    // MARK: - Notifications
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error.localizedDescription)")
            }
        }
    }
    
    private func sendTemperatureNotification(temperature: Double) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized else {
                print("⚠️ iPhone notifications not authorized. Status: \(settings.authorizationStatus.rawValue)")
                // Request permission if not determined
                if settings.authorizationStatus == .notDetermined {
                    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                        if granted {
                            // Retry sending notification
                            self.sendTemperatureNotification(temperature: temperature)
                        }
                    }
                }
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "🔥 Sauna is Ready!"
            content.body = String(format: "Sauna has reached %.0f°C", temperature)
            content.sound = .default
            content.badge = 1
            content.categoryIdentifier = "SAUNA_READY"
            
            // Add user info for potential deep linking
            content.userInfo = [
                "temperature": temperature,
                "type": "sauna_ready"
            ]
            
            let identifier = "sauna-ready-\(Date().timeIntervalSince1970)"
            
            let request = UNNotificationRequest(
                identifier: identifier,
                content: content,
                trigger: nil // Immediate notification
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("❌ Failed to send iPhone notification: \(error.localizedDescription)")
                } else {
                    print("✅ iPhone notification sent: Sauna ready at \(temperature)°C")
                }
            }
        }
    }
    
    // MARK: - Temperature Formatting
    
    func formattedTemperature() -> String {
        guard let temp = currentTemperature else {
            return "N/A"
        }
        return String(format: "%.1f°C", temp)
    }
    
    func formattedHumidity() -> String {
        guard let humidity = currentHumidity else {
            return "N/A"
        }
        return String(format: "%.1f%%", humidity)
    }
    
    // MARK: - Sauna Session
    
    @MainActor
    func startSaunaSession() async {
        guard !isSessionActive else { return }
        
        let startTime = Date()
        sessionStartTime = startTime
        sessionElapsedTime = 0
        isSessionActive = true
        
        // Start workout on Apple Watch
        WatchConnectivityManager.shared.startWorkoutOnWatch(workoutName: "Sauna")
        
        // Start session timer
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.sessionStartTime else { return }
            self.sessionElapsedTime = Date().timeIntervalSince(startTime)
        }
        
        // Create session on backend
        Task {
            do {
                let sessionData = SaunaSessionData(
                    sessionId: nil,
                    startTime: startTime,
                    endTime: nil,
                    temperature: currentTemperature,
                    humidity: currentHumidity,
                    heartRateAvg: nil,
                    duration: 0
                )
                
                let response = try await apiService.createSaunaSession(sessionData)
                await MainActor.run {
                    self.currentSessionId = response.sessionId
                }
            } catch {
                print("Failed to create sauna session: \(error.localizedDescription)")
            }
        }
    }
    
    @MainActor
    func endSaunaSession(heartRateAvg: Double? = nil) async {
        guard isSessionActive, let startTime = sessionStartTime else { return }
        
        // Stop workout on Apple Watch
        WatchConnectivityManager.shared.stopWorkoutOnWatch()
        
        // Stop session timer
        sessionTimer?.invalidate()
        sessionTimer = nil
        
        let endTime = Date()
        let duration = endTime.timeIntervalSince(startTime)
        let sessionId = currentSessionId
        
        isSessionActive = false
        let savedStartTime = startTime
        sessionStartTime = nil
        currentSessionId = nil
        sessionElapsedTime = 0
        
        // End session on backend and save to history
        Task {
            do {
                let sessionData = SaunaSessionData(
                    sessionId: sessionId,
                    startTime: savedStartTime,
                    endTime: endTime,
                    temperature: currentTemperature,
                    humidity: currentHumidity,
                    heartRateAvg: heartRateAvg,
                    duration: duration
                )
                
                let response = try await apiService.createSaunaSession(sessionData)
                
                // Add to local history
                await MainActor.run {
                    // Insert at the beginning to show most recent first
                    self.sessionHistory.insert(response, at: 0)
                    // Keep only last 50 sessions
                    if self.sessionHistory.count > 50 {
                        self.sessionHistory = Array(self.sessionHistory.prefix(50))
                    }
                }
            } catch {
                print("Failed to end sauna session: \(error.localizedDescription)")
                // Even if API fails, save locally
                let sessionData = SaunaSessionData(
                    sessionId: sessionId,
                    startTime: savedStartTime,
                    endTime: endTime,
                    temperature: currentTemperature,
                    humidity: currentHumidity,
                    heartRateAvg: heartRateAvg,
                    duration: duration
                )
                await MainActor.run {
                    self.sessionHistory.insert(sessionData, at: 0)
                    if self.sessionHistory.count > 50 {
                        self.sessionHistory = Array(self.sessionHistory.prefix(50))
                    }
                }
            }
        }
    }
    
    // MARK: - Session History
    
    func loadSessionHistory() async {
        // For now, history is stored in memory
        // In the future, you could fetch from API or UserDefaults
        // This could be called on app launch or when history view appears
    }
    
    func formattedDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
    
    func formattedSessionElapsedTime() -> String {
        let minutes = Int(sessionElapsedTime) / 60
        let seconds = Int(sessionElapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    // MARK: - Ready Timer
    
    var timeUntilReady: TimeInterval? {
        guard let temp = currentTemperature, temp < temperatureThreshold else {
            return nil
        }
        // Estimate time based on heating rate (assuming ~5°C per minute)
        let degreesNeeded = temperatureThreshold - temp
        let estimatedMinutes = degreesNeeded / 5.0
        return estimatedMinutes * 60
    }
    
    var isReady: Bool {
        guard let temp = currentTemperature else { return false }
        return temp >= temperatureThreshold
    }
    
    func formattedTimeUntilReady() -> String {
        guard let time = timeUntilReady else {
            return isReady ? "Ready!" : "Calculating..."
        }
        
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        
        if minutes > 0 {
            return String(format: "%d:%02d min", minutes, seconds)
        } else {
            return String(format: "%d sec", seconds)
        }
    }
}

