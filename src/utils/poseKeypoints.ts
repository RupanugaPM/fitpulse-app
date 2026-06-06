/** COCO / MoveNet 17 keypoint order */
export const COCO_KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export interface NormalizedKeypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export function normalizeKeypoints(
  raw: { x: number; y: number; score?: number; name?: string }[]
): NormalizedKeypoint[] {
  return raw.map((kp, i) => ({
    x: kp.x,
    y: kp.y,
    score: kp.score ?? 0,
    name: kp.name ?? COCO_KEYPOINT_NAMES[i] ?? `kp_${i}`,
  }));
}

export function getKeypoint(
  keypoints: NormalizedKeypoint[],
  name: string,
  minScore = 0.25
): NormalizedKeypoint | undefined {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp || kp.score < minScore) return undefined;
  return kp;
}

export function dist(a: NormalizedKeypoint, b: NormalizedKeypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleAtJoint(
  a: NormalizedKeypoint,
  b: NormalizedKeypoint,
  c: NormalizedKeypoint
): number {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg > 180 ? 360 - deg : deg;
}
