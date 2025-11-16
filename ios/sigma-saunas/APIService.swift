import Foundation
import Combine

// MARK: - API Models

// Internal format used by the app
struct SaunaSensorData: Codable {
    let temperature: Double // Celsius
    let humidity: Double? // Percentage
    let presence: Bool
    let timestamp: Date
    
    enum CodingKeys: String, CodingKey {
        case temperature, humidity, presence, timestamp
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        temperature = try container.decode(Double.self, forKey: .temperature)
        humidity = try container.decodeIfPresent(Double.self, forKey: .humidity)
        presence = try container.decode(Bool.self, forKey: .presence)
        let timestampString = try container.decode(String.self, forKey: .timestamp)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        timestamp = formatter.date(from: timestampString) ?? Date()
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(temperature, forKey: .temperature)
        try container.encodeIfPresent(humidity, forKey: .humidity)
        try container.encode(presence, forKey: .presence)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        try container.encode(formatter.string(from: timestamp), forKey: .timestamp)
    }
}

// API response format
struct SensorDataResponse: Codable {
    let deviceId: String
    let timestamp: String
    let data: SensorDataFields
}

struct SensorDataFields: Codable {
    let temp: Double?
    let hum: Double?
    let presence: Double?
    let batteryVoltage: Double?
    let batteryLoadV: Double?
    let rssi: Double?
    let tempEsp: Double?
    let targetTemp: Double?
    let saunaStatus: Double?
    let timeToTarget: Double?
    
    enum CodingKeys: String, CodingKey {
        case temp, hum, presence
        case batteryVoltage, batteryLoadV, rssi, tempEsp
        case targetTemp, saunaStatus, timeToTarget
    }
}

struct GymSessionData: Codable {
    let sessionId: String?
    let startTime: Date
    let endTime: Date?
    let caloriesBurned: Double
    let heartRateAvg: Double?
    let heartRateMax: Double?
    let workoutType: String
    let duration: TimeInterval
    
    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case caloriesBurned = "calories_burned"
        case heartRateAvg = "heart_rate_avg"
        case heartRateMax = "heart_rate_max"
        case workoutType = "workout_type"
        case duration
    }
}

struct SaunaSessionData: Codable {
    let sessionId: String?
    let startTime: Date
    let endTime: Date?
    let temperature: Double?
    let humidity: Double?
    let heartRateAvg: Double?
    let duration: TimeInterval
    
    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case temperature, humidity
        case heartRateAvg = "heart_rate_avg"
        case duration
    }
}

struct SessionSuggestion: Codable {
    let recommendedDuration: TimeInterval // minutes
    let recommendedTemperature: Double
    let reason: String
    let basedOn: String // "workout", "recovery", "calories", etc.
    
    enum CodingKeys: String, CodingKey {
        case recommendedDuration = "recommended_duration"
        case recommendedTemperature = "recommended_temperature"
        case reason
        case basedOn = "based_on"
    }
}

// MARK: - Wearable Data Models

struct WearableDataRequest: Codable {
    let heartRate: Double?
    let hrv: Double?
    let respiratoryRate: Double?
    
    enum CodingKeys: String, CodingKey {
        case heartRate = "heartRate"
        case hrv = "hrv"
        case respiratoryRate = "respiratoryRate"
    }
}

struct WearableDataResponse: Codable {
    let heartRate: Double?
    let hrv: Double?
    let respiratoryRate: Double?
    let lastUpdated: Date?
    
    enum CodingKeys: String, CodingKey {
        case heartRate = "heartRate"
        case hrv = "hrv"
        case respiratoryRate = "respiratoryRate"
        case lastUpdated = "lastUpdated"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        heartRate = try container.decodeIfPresent(Double.self, forKey: .heartRate)
        hrv = try container.decodeIfPresent(Double.self, forKey: .hrv)
        respiratoryRate = try container.decodeIfPresent(Double.self, forKey: .respiratoryRate)
        
        if let lastUpdatedString = try? container.decodeIfPresent(String.self, forKey: .lastUpdated) {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            lastUpdated = formatter.date(from: lastUpdatedString)
        } else {
            lastUpdated = nil
        }
    }
}

struct WearableDataPostResponse: Codable {
    let success: Bool
    let data: WearableDataResponse
}

// MARK: - API Service

class APIService: ObservableObject {
    static let shared = APIService()
    
    private var baseURL: String {
        // Check UserDefaults first, then use default
        if let customURL = UserDefaults.standard.string(forKey: "api_base_url"), !customURL.isEmpty {
            return customURL
        }
        // Default to live API
        return "https://sigma-saunas.vercel.app"
    }
    
    private let session: URLSession
    
    @Published var isConnected: Bool = false
    @Published var lastError: String?
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 30
        session = URLSession(configuration: config)
    }
    
    // MARK: - Sauna Sensor Data
    
    func fetchSaunaSensorData() async throws -> SaunaSensorData {
        guard let url = URL(string: "\(baseURL)/api/sensor/current") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        // Decode API response
        let decoder = JSONDecoder()
        let responseData = try decoder.decode(SensorDataResponse.self, from: data)
        
        // Map API response to our internal format
        guard let temp = responseData.data.temp else {
            throw APIError.missingData
        }
        
        let humidity = responseData.data.hum
        let presence = (responseData.data.presence ?? 0) > 0
        
        // Parse timestamp
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timestamp = formatter.date(from: responseData.timestamp) ?? Date()
        
        // Create SaunaSensorData by encoding to JSON and decoding
        // This works around the Codable-only init requirement
        let dataDict: [String: Any] = [
            "temperature": temp,
            "humidity": humidity as Any,
            "presence": presence,
            "timestamp": formatter.string(from: timestamp)
        ]
        
        let jsonData = try JSONSerialization.data(withJSONObject: dataDict)
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(SaunaSensorData.self, from: jsonData)
    }
    
    // MARK: - Gym Session
    
    func createGymSession(_ sessionData: GymSessionData) async throws -> GymSessionData {
        guard let url = URL(string: "\(baseURL)/gym/sessions") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(sessionData)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(GymSessionData.self, from: data)
    }
    
    func updateGymSession(_ sessionData: GymSessionData) async throws -> GymSessionData {
        guard let sessionId = sessionData.sessionId,
              let url = URL(string: "\(baseURL)/gym/sessions/\(sessionId)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(sessionData)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(GymSessionData.self, from: data)
    }
    
    // MARK: - Sauna Session
    
    func createSaunaSession(_ sessionData: SaunaSessionData) async throws -> SaunaSessionData {
        guard let url = URL(string: "\(baseURL)/sauna/sessions") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(sessionData)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(SaunaSessionData.self, from: data)
    }
    
    // MARK: - Session Suggestions
    
    func getSaunaSessionSuggestion(caloriesBurned: Double? = nil, 
                                   workoutType: String? = nil,
                                   recoveryDays: Int? = nil) async throws -> SessionSuggestion {
        guard let url = URL(string: "\(baseURL)/sauna/suggestions") else {
            throw APIError.invalidURL
        }
        
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var queryItems: [URLQueryItem] = []
        
        if let calories = caloriesBurned {
            queryItems.append(URLQueryItem(name: "calories_burned", value: String(calories)))
        }
        if let workout = workoutType {
            queryItems.append(URLQueryItem(name: "workout_type", value: workout))
        }
        if let recovery = recoveryDays {
            queryItems.append(URLQueryItem(name: "recovery_days", value: String(recovery)))
        }
        
        components?.queryItems = queryItems
        
        guard let finalURL = components?.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: finalURL)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(SessionSuggestion.self, from: data)
    }
    
    // MARK: - Session History
    
    struct SessionHistoryResponse: Codable {
        let sessions: [SessionHistoryItem]
        let nextToken: String?
        
        enum CodingKeys: String, CodingKey {
            case sessions, nextToken
        }
    }
    
    struct SessionHistoryItem: Codable {
        let deviceId: String
        let sessionId: String
        let timestamp: String
        let durationMs: Double?
        let stats: String?
        
        enum CodingKeys: String, CodingKey {
            case deviceId, sessionId, timestamp, durationMs, stats
        }
    }
    
    func fetchSessionHistory(startTimestamp: Date? = nil, 
                            endTimestamp: Date? = nil,
                            nextToken: String? = nil) async throws -> SessionHistoryResponse {
        var components = URLComponents(string: "\(baseURL)/api/sensor/sessions")
        var queryItems: [URLQueryItem] = []
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let start = startTimestamp {
            queryItems.append(URLQueryItem(name: "startTimestamp", value: formatter.string(from: start)))
        }
        if let end = endTimestamp {
            queryItems.append(URLQueryItem(name: "endTimestamp", value: formatter.string(from: end)))
        }
        if let token = nextToken {
            queryItems.append(URLQueryItem(name: "nextToken", value: token))
        }
        
        components?.queryItems = queryItems.isEmpty ? nil : queryItems
        
        guard let url = components?.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(SessionHistoryResponse.self, from: data)
    }
    
    // MARK: - Wearable Data
    
    func getWearableData() async throws -> WearableDataResponse {
        guard let url = URL(string: "\(baseURL)/api/wearable/data") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(WearableDataResponse.self, from: data)
    }
    
    func postWearableData(_ data: WearableDataRequest) async throws -> WearableDataPostResponse {
        guard let url = URL(string: "\(baseURL)/api/wearable/data") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(data)
        
        let (responseData, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorString = String(data: responseData, encoding: .utf8) ?? "Unknown error"
            print("Wearable data API error: \(httpResponse.statusCode) - \(errorString)")
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(WearableDataPostResponse.self, from: responseData)
    }
    
    // MARK: - Health Check
    
    func checkConnection() async -> Bool {
        // Try fetching sensor data as a health check
        do {
            _ = try await fetchSaunaSensorData()
            await MainActor.run {
                self.isConnected = true
                self.lastError = nil
            }
            return true
        } catch {
            await MainActor.run {
                self.isConnected = false
                self.lastError = error.localizedDescription
            }
            return false
        }
    }
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case encodingError(Error)
    case missingData
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP Error: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Encoding error: \(error.localizedDescription)"
        case .missingData:
            return "Missing temperature or humidity data"
        }
    }
}

