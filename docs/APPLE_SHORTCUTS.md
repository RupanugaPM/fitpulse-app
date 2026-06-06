# Apple Shortcuts — Log push-ups to FitPulse

Use this if you don't have the iOS companion app yet.

## Prerequisites

1. FitPulse account signed in on web
2. Apple Watch paired via **Devices** (get a device token via curl — see `mobile/ios-companion/README.md`)

## Shortcut steps

1. Open **Shortcuts** on iPhone
2. Create new shortcut: **Log FitPulse Push-ups**
3. Add **Ask for Input** (Number) — "How many push-ups?"
4. Add **Get Contents of URL**:
   - URL: `http://YOUR_SERVER:3001/api/wearables/sync`
   - Method: POST
   - Headers: `X-Device-Token` = your device token
   - Request Body: JSON

```json
{
  "pushups": {
    "reps": [Provided Input],
    "durationSec": 60
  }
}
```

5. Add to Home Screen or run from Apple Watch (Shortcuts complication)

> Replace `YOUR_SERVER` with your machine IP when testing locally, or production API URL.
