import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Watch,
  Smartphone,
  RefreshCw,
  Unplug,
  Copy,
  Check,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { wearableApi, integrationsApi, type WearableDevice } from '../api/client';
import './DevicesPage.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function DevicesPage() {
  const user = useAuthStore((s) => s.user);
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpires, setPairingExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [integrations, setIntegrations] = useState<Awaited<
    ReturnType<typeof integrationsApi.status>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [d, i] = await Promise.all([
        wearableApi.listDevices(),
        integrationsApi.status(),
      ]);
      setDevices(d.devices);
      setIntegrations(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load devices');
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const startPairing = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await wearableApi.startPairing();
      setPairingCode(res.pairingCode);
      setPairingExpires(res.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start pairing');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const disconnect = async (id: string) => {
    await wearableApi.disconnect(id);
    await load();
  };

  if (!user) {
    return (
      <div className="page devices-page">
        <h1>Devices &amp; integrations</h1>
        <p className="devices-hint">
          <Link to="/login">Sign in</Link> to connect Apple Watch and sync XP.
        </p>
      </div>
    );
  }

  return (
    <div className="page devices-page">
      <h1>Devices &amp; integrations</h1>
      <p className="devices-sub">
        Sync push-ups and workouts from Apple Watch, Health, and more.
      </p>

      {error && <p className="devices-error">{error}</p>}

      <section className="card device-card apple">
        <div className="device-card-head">
          <Watch size={28} className="accent-icon" />
          <div>
            <h2>Apple Watch</h2>
            <span>Sync push-up sessions &amp; workouts to your FitPulse account</span>
          </div>
        </div>

        {devices.filter((d) => d.platform === 'apple_watch').length > 0 ? (
          <ul className="connected-list">
            {devices
              .filter((d) => d.platform === 'apple_watch')
              .map((d) => (
                <li key={d.id}>
                  <div>
                    <strong>{d.deviceName ?? 'Apple Watch'}</strong>
                    <span>
                      Last sync:{' '}
                      {d.lastSyncAt
                        ? new Date(d.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => disconnect(d.id)}
                  >
                    <Unplug size={16} /> Disconnect
                  </button>
                </li>
              ))}
          </ul>
        ) : (
          <>
            {!pairingCode ? (
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={loading}
                onClick={startPairing}
              >
                <RefreshCw size={18} /> Connect Apple Watch
              </button>
            ) : (
              <div className="pairing-box">
                <p>Enter this code in the FitPulse iOS companion app:</p>
                <div className="pairing-code" onClick={copyCode} role="button" tabIndex={0}>
                  {pairingCode}
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </div>
                <p className="pairing-expires">
                  Expires {pairingExpires ? new Date(pairingExpires).toLocaleTimeString() : 'soon'}
                </p>
                <button type="button" className="btn btn-secondary btn-block" onClick={load}>
                  I&apos;ve paired — refresh
                </button>
              </div>
            )}
          </>
        )}

        <details className="setup-details">
          <summary>Setup guide (iOS companion)</summary>
          <ol>
            <li>Install the FitPulse iOS app (see <code>mobile/ios-companion</code> in project)</li>
            <li>Tap Connect Apple Watch above and copy the 6-digit code</li>
            <li>Open FitPulse on iPhone → enter code → allow Health access</li>
            <li>Complete push-ups on Watch or phone — data syncs automatically</li>
          </ol>
          <p className="api-hint">
            API sync URL: <code>{API_URL}/api/wearables/sync</code>
          </p>
        </details>
      </section>

      <section className="card device-card">
        <div className="device-card-head">
          <Activity size={28} />
          <div>
            <h2>Google Fit</h2>
            <span>Import activity &amp; workout data</span>
          </div>
        </div>
        {integrations?.googleFit.available ? (
          integrations.googleFit.connected ? (
            <p className="connected-badge">Connected</p>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={async () => {
                const { authUrl } = await integrationsApi.googleFitConnect();
                window.location.href = authUrl;
              }}
            >
              Connect Google Fit
            </button>
          )
        ) : (
          <p className="coming-soon">Configure GOOGLE_FIT_CLIENT_ID in server/.env to enable.</p>
        )}
      </section>

      <section className="card device-card muted">
        <div className="device-card-head">
          <Smartphone size={28} />
          <div>
            <h2>More integrations</h2>
            <span>Coming soon</span>
          </div>
        </div>
        <ul className="coming-list">
          <li>Fitbit</li>
          <li>Garmin Connect</li>
          <li>Samsung Health</li>
        </ul>
      </section>

      <Link to="/settings" className="btn btn-ghost btn-block">
        Back to settings
      </Link>
    </div>
  );
}
