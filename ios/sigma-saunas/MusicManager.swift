import Foundation
import Combine

class MusicManager: ObservableObject {
    static let shared = MusicManager()
    
    @Published var isPlaying: Bool = false
    @Published var currentTrack: String? = nil
    @Published var isMusicEnabled: Bool = false
    @Published var elapsedTime: TimeInterval = 0
    
    private var musicTimer: Timer?
    private var startTime: Date?
    
    private init() {
        // Mock music manager - no actual audio playback
    }
    
    // MARK: - Music Control
    
    func enableMusic() {
        isMusicEnabled = true
        currentTrack = "Meditation Music"
        play()
    }
    
    func disableMusic() {
        isMusicEnabled = false
        stop()
    }
    
    func play() {
        guard isMusicEnabled else { return }
        
        if !isPlaying {
            startTime = Date()
            isPlaying = true
            currentTrack = "Meditation Music"
            
            // Start timer to track elapsed time
            musicTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self = self, let startTime = self.startTime else { return }
                self.elapsedTime = Date().timeIntervalSince(startTime)
            }
        }
    }
    
    func pause() {
        musicTimer?.invalidate()
        musicTimer = nil
        isPlaying = false
    }
    
    func stop() {
        musicTimer?.invalidate()
        musicTimer = nil
        isPlaying = false
        currentTrack = nil
        elapsedTime = 0
        startTime = nil
    }
    
    func nextTrack() {
        // Mock - just update the track name
        currentTrack = "Meditation Music"
    }
    
    func previousTrack() {
        // Mock - just update the track name
        currentTrack = "Meditation Music"
    }
    
    func formattedElapsedTime() -> String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

