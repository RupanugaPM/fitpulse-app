# FitPulse iOS & Apple Watch Companion

Sync push-ups and workouts from **Apple Watch** / **Apple Health** to your FitPulse account.

## Architecture

```
Apple Watch  ←→  iPhone (FitPulse iOS)  ←→  FitPulse API  ←→  Web app
     │                    │                      │
  Workout UI         HealthKit read          SQL + XP sync
```

The web app cannot talk to Apple Watch directly. This companion app:

1. Pairs with your account using a **6-digit code** from [Devices](/devices)
2. Reads workouts / push-up data from **HealthKit**
3. POSTs to `POST /api/wearables/sync` with your **device token**

## Quick start (developers)

### 1. Pair from web

1. Run FitPulse web + server (`npm run dev` in root, `npm run dev` in `server/`)
2. Sign in → **Settings** → **Devices & Watch** → **Connect Apple Watch**
3. Copy the 6-digit code

### 2. Confirm pairing (curl test)

```bash
curl -X POST http://localhost:3001/api/wearables/pair/confirm \
  -H "Content-Type: application/json" \
  -d '{"pairingCode":"123456","platform":"apple_watch","deviceName":"My Apple Watch"}'
```

Save the returned `deviceToken`.

### 3. Sync push-ups from Watch

```bash
curl -X POST http://localhost:3001/api/wearables/sync \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: YOUR_DEVICE_TOKEN" \
  -d '{"pushups":{"reps":20,"durationSec":120,"heartRateAvg":128}}'
```

XP and push-up totals update on web automatically.

## Building the iOS app

1. Open Xcode → **File → New → App** (SwiftUI, iOS 17+)
2. Add **HealthKit** capability
3. Add **Watch App** target for Apple Watch extension
4. Copy `FitPulseAPIClient.swift` from this folder into the project
5. Implement pairing screen (text field for 6-digit code → call `pair/confirm`)
6. On workout complete, call `syncPushups(reps:durationSec:heartRate:)`

### HealthKit permissions

- `HKWorkoutType` — read workouts
- `HKQuantityType.activeEnergyBurned`
- `HKQuantityType.heartRate`

### Watch app

- Use **WatchConnectivity** to send rep count from Watch to iPhone
- iPhone calls FitPulse API sync endpoint

## API reference

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/wearables/pair/confirm` | None | Exchange 6-digit code for device token |
| `POST /api/wearables/sync` | `X-Device-Token` | Sync pushups / metrics |
| `GET /api/wearables/ping` | `X-Device-Token` | Health check |

## Apple Shortcuts (no code)

See `docs/APPLE_SHORTCUTS.md` for a Shortcut that logs push-ups via the API.
