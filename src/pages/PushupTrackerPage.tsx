import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, RotateCcw, Save, Square, Sparkles, AlertCircle, Scan } from 'lucide-react';
import { usePoseDetector } from '../hooks/usePoseDetector';
import { usePushupPose } from '../hooks/usePushupPose';
import { usePoseLoop } from '../hooks/usePoseLoop';
import { useAuthStore } from '../store/useAuthStore';
import { pushupApi } from '../api/client';
import { XP_PER_PUSHUP } from '../constants/xp';
import './PushupTrackerPage.css';

export function PushupTrackerPage() {
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const { detector, loading: modelLoading, error: modelError, backend } =
    usePoseDetector();
  const { stats, processKeypoints, reset, getAvgConfidence } = usePushupPose();
  const user = useAuthStore((s) => s.user);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const sessionActiveRef = useRef(false);
  sessionActiveRef.current = sessionActive;

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setVideoReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in browser settings, then try again.'
          : 'Could not open camera. Check that no other app is using it.';
      setCameraError(msg);
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoEl) videoEl.srcObject = null;
    setCameraOn(false);
    setVideoReady(false);
    setSessionActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  /** Attach stream after <video> is in the DOM (cameraOn === true) */
  useEffect(() => {
    if (!cameraOn) return;

    const stream = streamRef.current;
    if (!videoEl || !stream) return;

    let cancelled = false;

    const attach = async () => {
      videoEl.srcObject = stream;
      videoEl.muted = true;
      try {
        await videoEl.play();
        if (!cancelled) setVideoReady(true);
      } catch {
        if (!cancelled) {
          setCameraError('Could not start video playback. Tap Enable camera again.');
          stopCamera();
        }
      }
    };

    attach();
    return () => {
      cancelled = true;
    };
  }, [cameraOn, stopCamera, videoEl]);

  const aiEnabled = cameraOn && videoReady && !modelLoading && !modelError && Boolean(detector);

  usePoseLoop({
    video: videoEl,
    canvas: canvasEl,
    detector,
    enabled: aiEnabled,
    onKeypoints: (kps) => processKeypoints(kps, sessionActiveRef.current),
  });

  const startSession = () => {
    reset();
    startTimeRef.current = Date.now();
    setSessionActive(true);
    setSaveMessage(null);
    setLastXp(null);
  };

  const saveSession = async () => {
    if (stats.reps < 1) {
      setSaveMessage('Complete at least 1 push-up to save.');
      return;
    }
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const avgConfidence = getAvgConfidence();

    if (!user) {
      const localXp = stats.reps * XP_PER_PUSHUP;
      setLastXp(localXp);
      setSaveMessage(`+${localXp} XP (local only — sign in to sync)`);
      return;
    }

    setSaving(true);
    try {
      const result = await pushupApi.logSession({
        reps: stats.reps,
        durationSec,
        avgConfidence: avgConfidence > 0 ? avgConfidence : undefined,
      });
      useAuthStore.getState().setUser(result.user);
      setLastXp(result.session.xpEarned);
      setSaveMessage(
        `Saved! +${result.session.xpEarned} XP · Level ${result.user.level}`
      );
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const estimatedXp = stats.reps * XP_PER_PUSHUP;

  return (
    <div className="page pushup-page">
      <header className="pushup-header">
        <h1>AI Push-Up Tracker</h1>
        <p>Face the camera — upper body & arms in frame</p>
      </header>

      {user && (
        <div className="xp-bar card">
          <Sparkles size={18} className="accent-icon" />
          <div>
            <strong>Level {user.level}</strong>
            <span>{user.totalXp.toLocaleString()} XP · {user.totalPushups} total push-ups</span>
          </div>
        </div>
      )}

      <div className="camera-container card">
        <div
          className={`video-wrap ${cameraOn ? 'active' : ''}`}
          aria-hidden={!cameraOn}
        >
          <video
            ref={setVideoEl}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
          <canvas
            ref={setCanvasEl}
            className={`pose-canvas ${aiEnabled ? 'visible' : ''}`}
          />
          {cameraOn && !videoReady && (
            <div className="camera-loading">
              <p>Starting camera…</p>
            </div>
          )}
          {sessionActive && (
            <>
              <div className="rep-overlay">
                <span className="rep-count">{stats.reps}</span>
                <span className="rep-label">push-ups</span>
              </div>
              {stats.isReady && (
                <span className={`phase-badge ${stats.phase}`}>
                  {stats.phase === 'down' ? 'Down' : stats.phase === 'up' ? 'Up' : 'Ready'}
                </span>
              )}
            </>
          )}
        </div>
        {!cameraOn && (
          <div className="camera-placeholder">
            <Camera size={48} />
            <p>Camera off</p>
            <button type="button" className="btn btn-primary" onClick={startCamera}>
              Enable camera
            </button>
          </div>
        )}
        {cameraError && (
          <p className="camera-error">
            <AlertCircle size={16} /> {cameraError}
          </p>
        )}
        {modelError && (
          <p className="camera-error">
            <AlertCircle size={16} /> {modelError}
          </p>
        )}
        {modelLoading && cameraOn && (
          <p className="model-loading">
            <Scan size={16} /> Loading AI pose model…
          </p>
        )}
        {aiEnabled && !modelLoading && (
          <p className={`ai-status ${stats.bodyDetected ? 'ok' : 'warn'}`}>
            {stats.bodyDetected
              ? `AI tracking active (${backend}) · ${sessionActive ? 'Counting reps' : 'Preview'}`
              : 'Step back — show shoulders, arms, and chest in frame'}
          </p>
        )}
      </div>

      <div className="pushup-stats card">
        <div>
          <span className="stat-mini-label">Est. XP this session</span>
          <span className="stat-mini-value">+{estimatedXp}</span>
        </div>
        <div>
          <span className="stat-mini-label">AI confidence</span>
          <span className="stat-mini-value">
            {stats.isReady ? `${Math.round(stats.confidence * 100)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="stat-mini-label">Elbow ° / arm span</span>
          <span className="stat-mini-value">
            {stats.elbowAngle != null
              ? `${stats.elbowAngle}° · ${stats.armSpan ?? '—'}`
              : '—'}
          </span>
        </div>
        {sessionActive && (
          <div className="rep-hint-bar">
            <span
              className={`hint-pill ${stats.phase === 'down' ? 'active' : ''}`}
            >
              Down: bend + 3% drop
            </span>
            <span
              className={`hint-pill ${stats.phase === 'up' ? 'active' : ''}`}
            >
              Up: extend + rise
            </span>
            <span className="hint-pill">
              {stats.elbowAngle ?? '—'}° · drop {stats.bodyDropPct}%
            </span>
          </div>
        )}
        {sessionActive && stats.armsOnlyWarning && (
          <p className="form-warning">
            Lower your chest/hips — elbow-only movement won&apos;t count (need ~3% drop)
          </p>
        )}
      </div>

      <div className="pushup-actions">
        {cameraOn && videoReady && !sessionActive && !modelLoading && (
          <p className="camera-live-hint">
            {stats.bodyDetected
              ? 'Hold arms straight at the top briefly, then tap Start counting.'
              : 'Wait for green skeleton overlay, then tap Start counting.'}
          </p>
        )}
        {!sessionActive ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!cameraOn || !videoReady || modelLoading || !!modelError || !stats.bodyDetected}
            onClick={startSession}
          >
            Start counting
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={reset}>
              <RotateCcw size={18} /> Reset count
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveSession}
              disabled={saving}
            >
              <Save size={18} /> {saving ? 'Saving…' : 'Save & earn XP'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSessionActive(false);
              }}
            >
              <Square size={18} /> Pause
            </button>
          </>
        )}
        {cameraOn && (
          <button type="button" className="btn btn-ghost btn-block" onClick={stopCamera}>
            Turn off camera
          </button>
        )}
      </div>

      {saveMessage && (
        <p className={`save-msg ${lastXp ? 'success' : ''}`}>{saveMessage}</p>
      )}

      {!user && (
        <p className="signin-hint card">
          <Link to="/login">Sign in</Link> to save push-ups to your SQL profile and sync XP.
        </p>
      )}

      <div className="tips card">
        <strong>Tips for accurate AI counting</strong>
        <ul>
          <li>Face the camera — show shoulders, chest, and hips in frame</li>
          <li>Each rep needs bent arms (&lt;135°) <strong>and</strong> ~3%+ body drop</li>
          <li>At the top: arms straight (&gt;150°) and drop % near 0</li>
          <li>Arm curls at a desk will show a warning and won&apos;t add reps</li>
          <li>Full extension at the top before the next rep</li>
        </ul>
      </div>
    </div>
  );
}
