import SwiftUI
import UserNotifications

@main
struct sigma_saunas_Watch_AppApp: App {
    @StateObject private var workoutManager = WorkoutManager()
    @StateObject private var temperatureManager = SaunaTemperatureManager.shared
    @StateObject private var healthManager = HealthDataManager()
    @StateObject private var suggestionManager = SessionSuggestionManager.shared
    
    // Initialize managers lazily - don't block app launch
    private let watchConnectivity = WatchConnectivityManager.shared
    
    @Environment(\.scenePhase) private var scenePhase
    
    init() {
        // Request notification permissions on app launch
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("App init notification permission error: \(error.localizedDescription)")
            } else {
                print("App init notification permission granted: \(granted)")
            }
        }
        
        // Set notification delegate to handle foreground notifications
        UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workoutManager)
        .onAppear {
            WatchConnectivityManager.shared.setWorkoutManager(workoutManager)
        }
                .environmentObject(watchConnectivity)
                .environmentObject(temperatureManager)
                .onChange(of: scenePhase) { oldPhase, newPhase in
                    // Handle app lifecycle changes
                    if newPhase == .background {
                        temperatureManager.handleAppEnteredBackground()
                    } else if newPhase == .active && oldPhase == .background {
                        temperatureManager.handleAppEnteredForeground()
                    }
                }
                .onAppear {
                    // UI is now visible, managers can finish initializing in background
                }
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
