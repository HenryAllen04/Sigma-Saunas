import Foundation
import Combine

// MARK: - API Models

struct SensorDataResponse: Codable {
    let deviceId: String
    let timestamp: String
    let data: SensorData
}

struct SensorData: Codable {
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

struct SaunaSensorData {
    let temperature: Double
    let humidity: Double
    let presence: Bool
    let timestamp: Date
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

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case missingData
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .missingData:
            return "Missing temperature or humidity data"
        }
    }
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
        
        let decoder = JSONDecoder()
        let responseData = try decoder.decode(SensorDataResponse.self, from: data)
        
        // Map API response to our internal format
        guard let temp = responseData.data.temp else {
            throw APIError.missingData
        }
        
        let humidity = responseData.data.hum ?? 0.0
        let presence = (responseData.data.presence ?? 0) > 0
        
        // Parse timestamp
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timestamp = formatter.date(from: responseData.timestamp) ?? Date()
        
        return SaunaSensorData(
            temperature: temp,
            humidity: humidity,
            presence: presence,
            timestamp: timestamp
        )
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
