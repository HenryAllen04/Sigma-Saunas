import Foundation
import WatchConnectivity
import Combine

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    private var session: WCSession?
    
    @Published var isReachable: Bool = false
    @Published var isPaired: Bool = false
    @Published var isWatchAppInstalled: Bool = false
    @Published var activationState: WCSessionActivationState = .notActivated
    
    // Data received from Watch
    @Published var watchHeartRate: Double? = nil
    @Published var watchWorkoutRunning: Bool = false
    
    // Send temperature to Watch
    func sendTemperature(_ temperature: Double, humidity: Double? = nil) {
        // Don't try to send if watch is not paired
        guard isWatchAvailable else {
            print("Watch not available, skipping temperature update")
            return
        }
        
        var message: [String: Any] = [
            "temperature": temperature,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let humidity = humidity {
            message["humidity"] = humidity
        }
        
        sendMessage(message) { reply in
            print("Received reply from Watch: \(reply)")
        } errorHandler: { [weak self] error in
            print("Error sending temperature to Watch: \(error.localizedDescription)")
            // If not reachable but paired, use application context for background delivery
            if let self = self, self.isPaired {
                do {
                    try self.updateApplicationContext(message)
                } catch {
                    print("Failed to update application context: \(error.localizedDescription)")
                }
            }
        }
    }
    
    // Send start workout command to Watch
    func startWorkoutOnWatch(workoutName: String = "Sauna") {
        // Don't try to send if watch is not paired
        guard isWatchAvailable else {
            print("Watch not available, cannot start workout on Watch")
            return
        }
        
        let message: [String: Any] = [
            "command": "startWorkout",
            "workoutName": workoutName,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendMessage(message) { reply in
            print("Received reply from Watch for start workout: \(reply)")
        } errorHandler: { [weak self] error in
            print("Error sending start workout to Watch: \(error.localizedDescription)")
            // If not reachable but paired, use application context for background delivery
            if let self = self, self.isPaired {
                do {
                    try self.updateApplicationContext(message)
                } catch {
                    print("Failed to update application context: \(error.localizedDescription)")
                }
            }
        }
    }
    
    // Send stop workout command to Watch
    func stopWorkoutOnWatch() {
        // Don't try to send if watch is not paired
        guard isWatchAvailable else {
            print("Watch not available, cannot stop workout on Watch")
            return
        }
        
        let message: [String: Any] = [
            "command": "stopWorkout",
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendMessage(message) { reply in
            print("Received reply from Watch for stop workout: \(reply)")
        } errorHandler: { [weak self] error in
            print("Error sending stop workout to Watch: \(error.localizedDescription)")
            // If not reachable but paired, use application context for background delivery
            if let self = self, self.isPaired {
                do {
                    try self.updateApplicationContext(message)
                } catch {
                    print("Failed to update application context: \(error.localizedDescription)")
                }
            }
        }
    }
    
    override init() {
        super.init()
        // Don't block app launch - setup session asynchronously
        Task { @MainActor in
            // Small delay to let UI appear first
            try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
            setupSession()
        }
    }
    
    private func setupSession() {
        guard WCSession.isSupported() else {
            print("WatchConnectivity not supported on this device")
            DispatchQueue.main.async {
                self.isPaired = false
                self.isReachable = false
            }
            return
        }
        
        session = WCSession.default
        session?.delegate = self
        
        // Check if watch is paired before activating
        if let session = session {
            DispatchQueue.main.async {
                self.isPaired = session.isPaired
                self.isWatchAppInstalled = session.isWatchAppInstalled
            }
        }
        
        // Activate asynchronously - don't wait for it
        session?.activate()
    }
    
    // Check if watch is available and paired
    var isWatchAvailable: Bool {
        guard let session = session else { return false }
        return session.isPaired && (session.isWatchAppInstalled || session.isReachable)
    }
    
    // Send message to Watch
    func sendMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil, errorHandler: ((Error) -> Void)? = nil) {
        guard let session = session else {
            print("Watch session not available")
            errorHandler?(NSError(domain: "WatchConnectivity", code: -1, userInfo: [NSLocalizedDescriptionKey: "Watch session not available"]))
            return
        }
        
        guard session.isPaired else {
            print("Watch is not paired")
            errorHandler?(NSError(domain: "WatchConnectivity", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch is not paired"]))
            return
        }
        
        guard session.isReachable else {
            print("Watch is not reachable")
            errorHandler?(NSError(domain: "WatchConnectivity", code: -3, userInfo: [NSLocalizedDescriptionKey: "Watch is not reachable"]))
            return
        }
        
        session.sendMessage(message, replyHandler: replyHandler, errorHandler: errorHandler)
    }
    
    // Update application context (for background transfers)
    func updateApplicationContext(_ context: [String: Any]) throws {
        guard let session = session else {
            throw NSError(domain: "WatchConnectivity", code: -1, userInfo: [NSLocalizedDescriptionKey: "Watch session not available"])
        }
        
        guard session.isPaired else {
            throw NSError(domain: "WatchConnectivity", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch is not paired"])
        }
        
        try session.updateApplicationContext(context)
    }
    
    // Transfer user info (guaranteed delivery)
    func transferUserInfo(_ userInfo: [String: Any]) {
        guard let session = session, session.isPaired else {
            print("Cannot transfer user info: Watch not paired")
            return
        }
        session.transferUserInfo(userInfo)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.activationState = activationState
            
            // Safely check paired status
            self.isPaired = session.isPaired
            self.isWatchAppInstalled = session.isWatchAppInstalled
            
            // Only update reachable if paired
            if session.isPaired {
                self.isReachable = session.isReachable
            } else {
                self.isReachable = false
                // Clear watch data if not paired
                self.watchHeartRate = nil
                self.watchWorkoutRunning = false
            }
            
            if let error = error {
                print("WCSession activation error: \(error.localizedDescription)")
            } else {
                if session.isPaired {
                    print("WCSession activated with state: \(activationState.rawValue), Watch paired: \(session.isPaired)")
                } else {
                    print("WCSession activated but no Watch is paired")
                }
            }
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            // Only update reachable if paired
            if session.isPaired {
                self.isReachable = session.isReachable
            } else {
                self.isReachable = false
            }
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("WCSession became inactive")
    }
    
    func sessionDidDeactivate(_ session: WCSession) {
        print("WCSession deactivated, reactivating...")
        session.activate()
    }
    
    // Receive messages from Watch
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.processMessage(message)
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async {
            self.processMessage(message)
            replyHandler(["status": "received"])
        }
    }
    
    // Receive application context
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.processMessage(applicationContext)
        }
    }
    
    private func processMessage(_ message: [String: Any]) {
        // Process heart rate - accept all values including 0 (means no reading yet)
        if let heartRate = message["heartRate"] as? Double {
            print("📥 iPhone received heart rate: \(heartRate) bpm")
            self.watchHeartRate = heartRate >= 0 ? heartRate : nil
        }
        
        if let isRunning = message["workoutRunning"] as? Bool {
            print("📥 iPhone received workout status: \(isRunning ? "Running" : "Stopped")")
            self.watchWorkoutRunning = isRunning
        }
    }
}

