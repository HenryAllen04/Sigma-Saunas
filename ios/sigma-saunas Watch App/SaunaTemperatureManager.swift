import Foundation
import UserNotifications
import Combine

class SaunaTemperatureManager: ObservableObject {
    static let shared = SaunaTemperatureManager()
    
    @Published var currentTemperature: Double? = nil
    @Published var currentHumidity: Double? = nil
    @Published var isReady: Bool = false
    
    private let readyThreshold: Double = 80.0 // Match iOS app default
    private var hasNotifiedReady: Bool = false
    private var appBackgroundTime: Date?
    private let apiService = APIService.shared
    private var updateTimer: Timer?
    private var lastUpdateTime: Date?
    
    private init() {
        requestNotificationPermission()
        // Don't block app launch - defer API calls
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
            lastUpdateTime = sensorData.timestamp
            
            print("✅ Watch fetched sensor data: Temp=\(sensorData.temperature)°C, Humidity=\(sensorData.humidity)%")
            
            // Check if sauna is ready and send notification
            if sensorData.temperature >= readyThreshold {
                isReady = true
                // Send notification when threshold is reached (only once)
                if !hasNotifiedReady {
                    hasNotifiedReady = true
                    print("🔥 Watch: Sauna ready from API! Sending notification at \(sensorData.temperature)°C")
                    sendReadyNotification(temperature: sensorData.temperature)
                }
            } else if sensorData.temperature < readyThreshold {
                isReady = false
                hasNotifiedReady = false
            }
        } catch {
            print("Watch failed to fetch sensor data: \(error.localizedDescription)")
            // In development, use mock data
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
            self.lastUpdateTime = Date()
            
            // Check if sauna is ready and send notification
            if mockTemp >= self.readyThreshold {
                self.isReady = true
                // Send notification when threshold is reached (only once)
                if !self.hasNotifiedReady {
                    self.hasNotifiedReady = true
                    print("🔥 Watch: Sauna ready from mock data! Sending notification at \(mockTemp)°C")
                    self.sendReadyNotification(temperature: mockTemp)
                }
            } else if mockTemp < self.readyThreshold {
                self.isReady = false
                self.hasNotifiedReady = false
            }
        }
        
        print("📤 Watch using mock data: Temp=\(mockTemp)°C, Humidity=\(mockHumidity)%")
    }
    
    // MARK: - App Lifecycle
    
    func handleAppEnteredBackground() {
        print("Watch app entered background")
        let backgroundTime = Date()
        appBackgroundTime = backgroundTime
        
        // Cancel any existing pending notifications
        cancelPendingNotifications()
        
        // Schedule a notification to fire 10 seconds after app closes
        // Use scheduled notification instead of background task so it works even if app terminates
        if isReady && !hasNotifiedReady, let temp = currentTemperature {
            scheduleDelayedNotification(temperature: temp, delay: 10.0)
        }
    }
    
    private func scheduleDelayedNotification(temperature: Double, delay: TimeInterval) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized else {
                print("Notifications not authorized")
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Sauna is ready"
            content.body = String(format: "Temperature: %.0f°C", temperature)
            content.sound = .default
            content.badge = 1
            content.categoryIdentifier = "SAUNA_READY"
            
            let identifier = "sauna-ready-10s-delayed-\(Date().timeIntervalSince1970)"
            
            // Schedule notification with 10 second delay
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
            let request = UNNotificationRequest(
                identifier: identifier,
                content: content,
                trigger: trigger
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Failed to schedule delayed notification: \(error.localizedDescription)")
                } else {
                    print("✅ Scheduled notification for \(delay) seconds: Sauna ready at \(temperature)°C")
                    // Mark as notified after delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + delay + 0.5) { [weak self] in
                        self?.hasNotifiedReady = true
                    }
                }
            }
        }
    }
    
    func handleAppEnteredForeground() {
        print("Watch app entering foreground")
        appBackgroundTime = nil
        // Cancel pending notifications since app is now active
        cancelPendingNotifications()
    }
    
    // MARK: - Temperature Updates
    
    func updateTemperature(_ temperature: Double) {
        print("🔄 SaunaTemperatureManager.updateTemperature called with: \(temperature)°C")
        DispatchQueue.main.async {
            self.currentTemperature = temperature
            
            // Check if sauna is ready (reached threshold or above)
            if temperature >= self.readyThreshold {
                self.isReady = true
                
                // Send notification immediately when threshold is reached (only once)
                if !self.hasNotifiedReady {
                    self.hasNotifiedReady = true
                    print("🔥 Watch: Sauna ready! Sending notification at \(temperature)°C")
                    self.sendReadyNotification(temperature: temperature)
                }
            } else {
                // Reset notification flag if temperature drops below threshold
                self.hasNotifiedReady = false
                self.isReady = false
            }
            
            print("✅ SaunaTemperatureManager updated - temp: \(temperature)°C, ready: \(self.isReady), notified: \(self.hasNotifiedReady)")
        }
    }
    
    private func sendReadyNotification(temperature: Double) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized else {
                print("Watch notifications not authorized. Status: \(settings.authorizationStatus.rawValue)")
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Sauna is ready"
            content.body = String(format: "Temperature: %.0f°C", temperature)
            content.sound = .default
            content.badge = 1
            content.categoryIdentifier = "SAUNA_READY"
            
            let identifier = "sauna-ready-\(Date().timeIntervalSince1970)"
            
            // Immediate notification (nil trigger means immediate)
            let request = UNNotificationRequest(
                identifier: identifier,
                content: content,
                trigger: nil
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Failed to send Watch notification: \(error.localizedDescription)")
                } else {
                    print("✅ Watch notification sent: Sauna ready at \(temperature)°C")
                }
            }
        }
    }
    
    private func cancelPendingNotifications() {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            // Only cancel automatic notifications, not test notifications
            let saunaNotifications = requests.filter { 
                $0.identifier.contains("sauna-ready") && !$0.identifier.contains("test-sauna-ready")
            }
            let identifiers = saunaNotifications.map { $0.identifier }
            if !identifiers.isEmpty {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
                print("Cancelled \(identifiers.count) pending notifications")
            }
        }
    }
    
    // MARK: - Notifications
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            if settings.authorizationStatus == .notDetermined {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                    if let error = error {
                        print("Watch notification permission error: \(error.localizedDescription)")
                    } else {
                        print("Watch notification permission granted: \(granted)")
                    }
                }
            } else {
                print("Watch notification authorization status: \(settings.authorizationStatus.rawValue)")
            }
        }
    }
    
    
    // Format temperature for display
    func formattedTemperature() -> String {
        guard let temp = currentTemperature else {
            return "N/A"
        }
        return String(format: "%.1f°C", temp)
    }
    
    // MARK: - Ready Timer
    
    var timeUntilReady: TimeInterval? {
        guard let temp = currentTemperature, temp < readyThreshold else {
            return nil
        }
        // Estimate time based on heating rate (assuming ~5°C per minute)
        let degreesNeeded = readyThreshold - temp
        let estimatedMinutes = degreesNeeded / 5.0
        return estimatedMinutes * 60
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
    
    // MARK: - Test Notification (for demo)
    
    func sendTestNotification() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized else {
                print("Notifications not authorized")
                return
            }
            
            // Cancel any existing test notifications first
            UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
                let testNotifications = requests.filter { $0.identifier.contains("test-sauna-ready") }
                let testIdentifiers = testNotifications.map { $0.identifier }
                if !testIdentifiers.isEmpty {
                    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: testIdentifiers)
                }
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Sauna is ready"
            content.body = "Temperature: 70°C"
            content.sound = .default
            content.badge = 1
            content.categoryIdentifier = "SAUNA_READY"
            
            // Use unique identifier that won't be cancelled by cancelPendingNotifications()
            let identifier = "test-sauna-ready-\(Date().timeIntervalSince1970)"
            
            // Schedule notification with 10 second delay - this will persist even if app closes
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 10.0, repeats: false)
            let request = UNNotificationRequest(
                identifier: identifier,
                content: content,
                trigger: trigger
            )
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("Failed to schedule test notification: \(error.localizedDescription)")
                } else {
                    print("✅ Test notification scheduled for 10 seconds! It will fire even if app closes.")
                }
            }
        }
    }
}

