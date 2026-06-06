import Foundation

/// Minimal FitPulse API client for iOS / watchOS companion apps.
struct FitPulseAPIClient {
    let baseURL: URL
    var deviceToken: String?

    init(baseURL: String = "http://localhost:3001") {
        self.baseURL = URL(string: baseURL)!
    }

    struct PairResponse: Codable {
        let deviceToken: String
        let deviceId: String
        let userId: String
    }

    struct SyncPushupsResponse: Codable {
        let ok: Bool
        struct PushupResult: Codable {
            let reps: Int
            let xpEarned: Int
        }
        let pushups: PushupResult?
    }

    func pair(code: String, deviceName: String = "Apple Watch") async throws -> PairResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/wearables/pair/confirm"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode([
            "pairingCode": code,
            "platform": "apple_watch",
            "deviceName": deviceName,
        ] as [String: String])

        let (data, _) = try await URLSession.shared.data(for: req)
        let res = try JSONDecoder().decode(PairResponse.self, from: data)
        deviceToken = res.deviceToken
        return res
    }

    func syncPushups(reps: Int, durationSec: Int, heartRateAvg: Int? = nil) async throws -> SyncPushupsResponse {
        guard let token = deviceToken else { throw URLError(.userAuthenticationRequired) }

        var req = URLRequest(url: baseURL.appendingPathComponent("/api/wearables/sync"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(token, forHTTPHeaderField: "X-Device-Token")

        var pushups: [String: Any] = ["reps": reps, "durationSec": durationSec]
        if let hr = heartRateAvg { pushups["heartRateAvg"] = hr }
        let body: [String: Any] = ["pushups": pushups]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(SyncPushupsResponse.self, from: data)
    }
}
