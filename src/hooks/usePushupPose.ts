import { useRef, useCallback, useState } from 'react';
import {
  normalizeKeypoints,
  getKeypoint,
  dist,
  angleAtJoint,
  type NormalizedKeypoint,
} from '../utils/poseKeypoints';

export type PushupPhase = 'idle' | 'up' | 'down';

export interface PoseStats {
  reps: number;
  phase: PushupPhase;
  confidence: number;
  elbowAngle: number | null;
  armSpan: number | null;
  bodyDropPct: number;
  armsOnlyWarning: boolean;
  bodyDetected: boolean;
  isReady: boolean;
}

interface RawKeypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

/** Elbow angle: high = straight, low = bent */
const ANGLE_BENT = 135;
const ANGLE_EXTENDED = 150;

/** Shoulder/hip must lower by ~3% of torso to count as a real push-up (not arm curl) */
const BODY_DROP_TO_ENTER_DOWN = 0.03;
const BODY_DROP_TO_COUNT_REP = 0.035;
const BODY_DROP_BACK_AT_TOP = 0.028;
const ARMS_ONLY_MAX_DROP = 0.022;

const MIN_DOWN_MS = 140;
const MIN_UP_MS = 120;
const REP_COOLDOWN_MS = 450;
const EMA_ALPHA = 0.35;

type ArmMetrics = { angle: number; span: number; score: number };

type BodyMetrics = {
  shoulderY: number;
  hipY: number;
  torsoLen: number;
  score: number;
};

function measureArm(
  keypoints: NormalizedKeypoint[],
  side: 'left' | 'right'
): ArmMetrics | null {
  const shoulder = getKeypoint(keypoints, `${side}_shoulder`, 0.2);
  const elbow = getKeypoint(keypoints, `${side}_elbow`, 0.2);
  const wrist = getKeypoint(keypoints, `${side}_wrist`, 0.2);
  let hip = getKeypoint(keypoints, `${side}_hip`, 0.15);
  if (!hip) hip = getKeypoint(keypoints, side === 'left' ? 'right_hip' : 'left_hip', 0.15);

  if (!shoulder || !elbow || !wrist) return null;

  const angle = angleAtJoint(shoulder, elbow, wrist);
  const torsoLen = Math.max(hip ? dist(shoulder, hip) : 0, dist(shoulder, wrist), 50);
  const span = dist(shoulder, wrist) / torsoLen;
  const score = (shoulder.score + elbow.score + wrist.score) / 3;
  return { angle, span, score };
}

function measureBody(keypoints: NormalizedKeypoint[]): BodyMetrics | null {
  const ls = getKeypoint(keypoints, 'left_shoulder', 0.2);
  const rs = getKeypoint(keypoints, 'right_shoulder', 0.2);
  const lh = getKeypoint(keypoints, 'left_hip', 0.15);
  const rh = getKeypoint(keypoints, 'right_hip', 0.15);
  if (!ls || !rs) return null;

  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = lh && rh ? (lh.y + rh.y) / 2 : lh?.y ?? rh?.y ?? shoulderY + 70;
  const torsoLen = Math.max(lh && rh ? dist({ ...ls, score: 1 }, lh) : dist(ls, rs), 60);
  return { shoulderY, hipY, torsoLen, score: (ls.score + rs.score) / 2 };
}

function combineArms(samples: ArmMetrics[]): ArmMetrics {
  const total = samples.reduce((s, a) => s + a.score, 0) || 1;
  return {
    angle: samples.reduce((s, a) => s + a.angle * a.score, 0) / total,
    span: samples.reduce((s, a) => s + a.span * a.score, 0) / total,
    score: Math.max(...samples.map((a) => a.score)),
  };
}

export function usePushupPose() {
  const [stats, setStats] = useState<PoseStats>({
    reps: 0,
    phase: 'idle',
    confidence: 0,
    elbowAngle: null,
    armSpan: null,
    bodyDropPct: 0,
    armsOnlyWarning: false,
    bodyDetected: false,
    isReady: false,
  });

  const phaseRef = useRef<PushupPhase>('idle');
  const repsRef = useRef(0);
  const downSinceRef = useRef<number | null>(null);
  const upSinceRef = useRef<number | null>(null);
  const lastRepAtRef = useRef(0);
  const hadRealBodyDropRef = useRef(false);
  const peakDropRef = useRef(0);
  const smoothAngleRef = useRef<number | null>(null);
  const smoothSpanRef = useRef<number | null>(null);
  const smoothShoulderYRef = useRef<number | null>(null);
  const smoothHipYRef = useRef<number | null>(null);
  const shoulderBaselineRef = useRef<number | null>(null);
  const hipBaselineRef = useRef<number | null>(null);
  const framesSeenRef = useRef(0);
  const confidenceSumRef = useRef(0);
  const confidenceCountRef = useRef(0);

  const processKeypoints = useCallback((raw: RawKeypoint[], counting = true) => {
    const keypoints = normalizeKeypoints(raw);
    const arms = [measureArm(keypoints, 'left'), measureArm(keypoints, 'right')].filter(
      (s): s is ArmMetrics => s != null
    );
    const body = measureBody(keypoints);

    if (arms.length === 0 || !body) {
      setStats((s) => ({ ...s, bodyDetected: false, isReady: false }));
      return;
    }

    const m = combineArms(arms);
    const ema = (prev: number | null, next: number) =>
      prev == null ? next : prev * (1 - EMA_ALPHA) + next * EMA_ALPHA;

    smoothAngleRef.current = ema(smoothAngleRef.current, m.angle);
    smoothSpanRef.current = ema(smoothSpanRef.current, m.span);
    smoothShoulderYRef.current = ema(smoothShoulderYRef.current, body.shoulderY);
    smoothHipYRef.current = ema(smoothHipYRef.current, body.hipY);

    const angle = smoothAngleRef.current!;
    const span = smoothSpanRef.current!;
    const shoulderY = smoothShoulderYRef.current!;
    const hipY = smoothHipYRef.current!;

    const atTopPose = angle > ANGLE_EXTENDED;

    if (shoulderBaselineRef.current == null || atTopPose) {
      if (shoulderBaselineRef.current == null) {
        shoulderBaselineRef.current = shoulderY;
        hipBaselineRef.current = hipY;
      } else {
        shoulderBaselineRef.current = Math.min(shoulderBaselineRef.current, shoulderY);
        hipBaselineRef.current = Math.min(hipBaselineRef.current!, hipY);
      }
    }

    const shoulderDrop =
      (shoulderY - shoulderBaselineRef.current) / body.torsoLen;
    const hipDrop = (hipY - hipBaselineRef.current!) / body.torsoLen;
    const bodyDropNorm = Math.max(0, shoulderDrop, hipDrop);
    const bodyDropPct = Math.round(bodyDropNorm * 100);

    peakDropRef.current = Math.max(peakDropRef.current, bodyDropNorm);

    const armsBent = angle < ANGLE_BENT;
    const armsExtended = angle > ANGLE_EXTENDED;
    const bodyLoweredEnough = bodyDropNorm >= BODY_DROP_TO_ENTER_DOWN;
    const bodyBackUp = bodyDropNorm <= BODY_DROP_BACK_AT_TOP;

    const armsOnly = armsBent && bodyDropNorm < ARMS_ONLY_MAX_DROP;

    /** Real push-up down = bent arms AND chest/hips moved down */
    const validDown = armsBent && bodyLoweredEnough;
    const validUp = armsExtended && bodyBackUp;

    if (counting) framesSeenRef.current += 1;
    const ready = framesSeenRef.current >= 2;

    if (!counting) {
      setStats({
        reps: repsRef.current,
        phase: phaseRef.current,
        confidence: m.score,
        elbowAngle: Math.round(angle),
        armSpan: Math.round(span * 100) / 100,
        bodyDropPct,
        armsOnlyWarning: armsOnly,
        bodyDetected: true,
        isReady: ready,
      });
      return;
    }

    confidenceSumRef.current += m.score;
    confidenceCountRef.current += 1;

    const now = Date.now();
    let phase = phaseRef.current;

    if (!ready) {
      setStats({
        reps: repsRef.current,
        phase,
        confidence: m.score,
        elbowAngle: Math.round(angle),
        armSpan: Math.round(span * 100) / 100,
        bodyDropPct,
        armsOnlyWarning: armsOnly,
        bodyDetected: true,
        isReady: false,
      });
      return;
    }

    if (peakDropRef.current >= BODY_DROP_TO_COUNT_REP) {
      hadRealBodyDropRef.current = true;
    }

    if (validDown) {
      downSinceRef.current ??= now;
      upSinceRef.current = null;

      if (
        (phase === 'up' || phase === 'idle') &&
        now - (downSinceRef.current ?? now) >= MIN_DOWN_MS
      ) {
        phase = 'down';
        phaseRef.current = 'down';
      }
    } else if (validUp) {
      if (phase === 'down' && hadRealBodyDropRef.current) {
        upSinceRef.current ??= now;
        const cooled = now - lastRepAtRef.current >= REP_COOLDOWN_MS;
        if (cooled && now - (upSinceRef.current ?? now) >= MIN_UP_MS) {
          repsRef.current += 1;
          lastRepAtRef.current = now;
          hadRealBodyDropRef.current = false;
          peakDropRef.current = 0;
          phase = 'up';
          phaseRef.current = 'up';
          downSinceRef.current = null;
          upSinceRef.current = null;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
          }
        }
      } else if (phase === 'idle') {
        phase = 'up';
        phaseRef.current = 'up';
        downSinceRef.current = null;
        upSinceRef.current = null;
      }
    }

    setStats({
      reps: repsRef.current,
      phase,
      confidence: m.score,
      elbowAngle: Math.round(angle),
      armSpan: Math.round(span * 100) / 100,
      bodyDropPct,
      armsOnlyWarning: armsOnly,
      bodyDetected: true,
      isReady: true,
    });
  }, []);

  const reset = useCallback(() => {
    repsRef.current = 0;
    phaseRef.current = 'idle';
    downSinceRef.current = null;
    upSinceRef.current = null;
    lastRepAtRef.current = 0;
    hadRealBodyDropRef.current = false;
    peakDropRef.current = 0;
    smoothAngleRef.current = null;
    smoothSpanRef.current = null;
    smoothShoulderYRef.current = null;
    smoothHipYRef.current = null;
    shoulderBaselineRef.current = null;
    hipBaselineRef.current = null;
    framesSeenRef.current = 0;
    confidenceSumRef.current = 0;
    confidenceCountRef.current = 0;
    setStats((s) => ({
      ...s,
      reps: 0,
      phase: 'idle',
      bodyDropPct: 0,
      armsOnlyWarning: false,
      isReady: false,
    }));
  }, []);

  const getAvgConfidence = useCallback(() => {
    if (confidenceCountRef.current === 0) return 0;
    return confidenceSumRef.current / confidenceCountRef.current;
  }, []);

  return { stats, processKeypoints, reset, getAvgConfidence };
}
