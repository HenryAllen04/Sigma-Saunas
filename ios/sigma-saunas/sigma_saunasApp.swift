import SwiftUI
import UserNotifications

@main
struct sigma_saunasApp: App {
    @StateObject private var healthManager = HealthManager()
    @StateObject private var saunaManager = SaunaManager.shared
    @StateObject private var musicManager = MusicManager.shared
    @StateObject private var meditationManager = MeditationManager.shared
    @StateObject private var suggestionEngine = SessionSuggestionEngine.shared
    
    init() {
        // Initialize WatchConnectivity lazily - don't block launch
        // It will activate asynchronously in the background
        _ = WatchConnectivityManager.shared
        
        // Request notification permissions on app launch
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("iPhone notification permission error: \(error.localizedDescription)")
            } else {
                print("iPhone notification permission granted: \(granted)")
            }
        }
        
        // Set notification delegate to handle foreground notifications
        UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
        
        // Don't check API connection on launch - it can timeout and block UI
        // Check connection later, after UI appears
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(healthManager)
                .environmentObject(WatchConnectivityManager.shared)
                .environmentObject(saunaManager)
                .environmentObject(musicManager)
                .environmentObject(meditationManager)
                .environmentObject(suggestionEngine)
        }
    }
}

// MARK: - Notification Delegate

class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationDelegate()
    
    // Present notification even when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is active
        completionHandler([.banner, .sound, .badge])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap if needed
        completionHandler()
    }
}
