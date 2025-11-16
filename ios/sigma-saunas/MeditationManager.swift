import Foundation
import Combine
import AVFoundation

class MeditationManager: ObservableObject {
    static let shared = MeditationManager()
    
    @Published var isMeditationActive: Bool = false
    @Published var meditationDuration: TimeInterval = 15 * 60 // 15 minutes default
    @Published var elapsedTime: TimeInterval = 0
    @Published var remainingTime: TimeInterval = 0
    @Published var meditationType: MeditationType = .breathing
    
    private var meditationTimer: Timer?
    private var startTime: Date?
    private var audioPlayer: AVAudioPlayer?
    
    enum MeditationType: String, CaseIterable {
        case breathing = "Breathing"
        case mindfulness = "Mindfulness"
        case bodyScan = "Body Scan"
        case guided = "Guided"
        
        var description: String {
            return self.rawValue
        }
    }
    
    private init() {
        remainingTime = meditationDuration
    }
    
    // MARK: - Meditation Control
    
    func startMeditation(type: MeditationType, duration: TimeInterval) {
        guard !isMeditationActive else { return }
        
        self.meditationType = type
        self.meditationDuration = duration
        self.remainingTime = duration
        self.elapsedTime = 0
        self.startTime = Date()
        self.isMeditationActive = true
        
        // Play ambient sound if available
        playAmbientSound(for: type)
        
        // Start timer
        meditationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateTime()
        }
    }
    
    func pauseMeditation() {
        meditationTimer?.invalidate()
        meditationTimer = nil
        audioPlayer?.pause()
    }
    
    func resumeMeditation() {
        guard isMeditationActive else { return }
        
        meditationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateTime()
        }
        audioPlayer?.play()
    }
    
    func endMeditation() {
        meditationTimer?.invalidate()
        meditationTimer = nil
        audioPlayer?.stop()
        audioPlayer = nil
        
        isMeditationActive = false
        elapsedTime = 0
        remainingTime = meditationDuration
        startTime = nil
    }
    
    private func updateTime() {
        guard let start = startTime else { return }
        
        elapsedTime = Date().timeIntervalSince(start)
        remainingTime = max(0, meditationDuration - elapsedTime)
        
        if remainingTime <= 0 {
            endMeditation()
            // Optionally send notification
            sendMeditationCompleteNotification()
        }
    }
    
    // MARK: - Audio
    
    private func playAmbientSound(for type: MeditationType) {
        // For now, we'll use system sounds
        // In production, you'd want to load actual meditation audio files
        // You can add meditation audio files to the app bundle and play them here
        
        // Example: Play a subtle ambient sound
        // This is a placeholder - implement actual audio playback as needed
        print("Starting ambient sound for \(type.rawValue)")
    }
    
    // MARK: - Notifications
    
    private func sendMeditationCompleteNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Meditation Complete"
        content.body = "Your \(meditationType.rawValue) meditation session has finished."
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "meditation-complete-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request)
    }
    
    // MARK: - Time Formatting
    
    func formattedRemainingTime() -> String {
        let minutes = Int(remainingTime) / 60
        let seconds = Int(remainingTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    func formattedElapsedTime() -> String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// Fix missing import
import UserNotifications

