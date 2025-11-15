import Foundation
import WatchConnectivity
import Combine

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    private var session: WCSession?
    private weak var workoutManager: WorkoutManager?
    
    @Published var isReachable: Bool = false
    @Published var activationState: WCSessionActivationState = .notActivated
    
    // Data received from iPhone
    @Published var temperature: Double? = nil
    @Published var humidity: Double? = nil
    
    func setWorkoutManager(_ manager: WorkoutManager) {
        self.workoutManager = manager
    }
    
    override init() {
        super.init()
        // Don't block app launch - setup session asynchronously
        Task { @MainActor in
            // Small delay to let UI appear first
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
            setupSession()
        }
    }
    
    private func setupSession() {
        guard WCSession.isSupported() else {
            print("WatchConnectivity not supported on Watch")
            return
        }
        
        session = WCSession.default
        session?.delegate = self
        // Activate asynchronously - don't wait for it
        session?.activate()
    }
    
    // Send message to iPhone
    func sendMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil, errorHandler: ((Error) -> Void)? = nil) {
        guard let session = session else {
            errorHandler?(NSError(domain: "WatchConnectivity", code: -1, userInfo: [NSLocalizedDescriptionKey: "Session not available"]))
            return
        }
        
        if session.isReachable {
            session.sendMessage(message, replyHandler: replyHandler, errorHandler: errorHandler)
        } else {
            // Use application context for background transfers
            do {
                try session.updateApplicationContext(message)
            } catch {
                print("Failed to update application context: \(error)")
                errorHandler?(error)
            }
        }
    }
    
    // Send heart rate update
    func sendHeartRate(_ heartRate: Double, isWorkoutRunning: Bool) {
        guard let session = session else {
            print("⚠️ Watch session not available, cannot send heart rate")
            return
        }
        
        // Ensure session is activated before sending
        guard session.activationState == .activated else {
            print("⚠️ Watch session not activated (state: \(session.activationState.rawValue)), cannot send heart rate")
            // Try to activate
            session.activate()
            return
        }
        
        let message: [String: Any] = [
            "heartRate": heartRate,
            "workoutRunning": isWorkoutRunning,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        print("📤 Watch attempting to send heart rate: \(heartRate) bpm, reachable: \(session.isReachable)")
        
        sendMessage(message) { reply in
            print("✅ Watch received reply from iPhone: \(reply)")
        } errorHandler: { error in
            print("❌ Watch error sending heart rate: \(error.localizedDescription)")
            // Try to use application context as fallback if message fails
            if !session.isReachable {
                do {
                    try session.updateApplicationContext(message)
                    print("📤 Watch used application context fallback for heart rate")
                } catch {
                    print("❌ Watch failed to update application context: \(error.localizedDescription)")
                }
            }
        }
    }
    
    // Update application context
    func updateApplicationContext(_ context: [String: Any]) throws {
        guard let session = session else { return }
        try session.updateApplicationContext(context)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.activationState = activationState
            // Note: isPaired is not available on watchOS, only on iOS
            self.isReachable = session.isReachable
            
            if let error = error {
                print("WCSession activation error: \(error.localizedDescription)")
            } else {
                print("WCSession activated on Watch with state: \(activationState.rawValue)")
            }
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }
    
    // Receive messages from iPhone
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.processMessage(message)
            print("Received message from iPhone: \(message)")
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async {
            self.processMessage(message)
            print("Received message from iPhone with reply handler: \(message)")
            replyHandler(["status": "received"])
        }
    }
    
    // Receive application context
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.processMessage(applicationContext)
            print("Received application context from iPhone: \(applicationContext)")
        }
    }
    
    private func processMessage(_ message: [String: Any]) {
        // Process commands from iPhone
        if let command = message["command"] as? String {
            if command == "startWorkout" {
                let workoutName = message["workoutName"] as? String ?? "Sauna"
                DispatchQueue.main.async {
                    // Start workout on Watch
                    if let manager = self.workoutManager {
                        manager.startWorkout()
                        print("Starting workout '\(workoutName)' on Watch")
                    } else {
                        print("WorkoutManager not set, cannot start workout")
                    }
                }
            } else if command == "stopWorkout" {
                DispatchQueue.main.async {
                    // Stop workout on Watch
                    if let manager = self.workoutManager {
                        manager.endWorkout()
                        print("Stopping workout on Watch")
                    } else {
                        print("WorkoutManager not set, cannot stop workout")
                    }
                }
            }
        }
        
        // Process temperature updates
        if let temp = message["temperature"] as? Double {
            print("📥 Watch received temperature: \(temp)°C")
            self.temperature = temp
            // Update temperature manager which will check for notification
            // Do this immediately to ensure notification fires even in background
            DispatchQueue.main.async {
                SaunaTemperatureManager.shared.updateTemperature(temp)
                print("✅ Updated SaunaTemperatureManager with temp: \(temp)°C")
            }
        }
        
        if let hum = message["humidity"] as? Double {
            print("📥 Watch received humidity: \(hum)%")
            self.humidity = hum
        }
    }
}

