import { useEffect, useRef } from 'react';
import type { PoseDetector } from '@tensorflow-models/pose-detection';
import { COCO_KEYPOINT_NAMES } from '../utils/poseKeypoints';

const SKELETON: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
];

type KeypointCallback = (
  keypoints: { x: number; y: number; score?: number; name?: string }[]
) => void;

interface Options {
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
  detector: PoseDetector | null;
  enabled: boolean;
  onKeypoints: KeypointCallback;
}

export function usePoseLoop({
  video,
  canvas,
  detector,
  enabled,
  onKeypoints,
}: Options) {
  const onKeypointsRef = useRef(onKeypoints);
  onKeypointsRef.current = onKeypoints;

  useEffect(() => {
    if (!enabled || !video || !canvas || !detector) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let busy = false;
    let rafId = 0;
    let lastTs = 0;
    const minIntervalMs = 66; // ~15 FPS — avoids stacking async inference calls

    const drawSkeleton = (
      keypoints: { x: number; y: number; score?: number; name?: string }[]
    ) => {
      const byName = new Map<string, { x: number; y: number; score: number }>();
      keypoints.forEach((kp, i) => {
        const name = kp.name ?? COCO_KEYPOINT_NAMES[i];
        if (name) byName.set(name, { x: kp.x, y: kp.y, score: kp.score ?? 0 });
      });

      ctx.strokeStyle = 'rgba(20, 184, 166, 0.85)';
      ctx.lineWidth = 3;
      for (const [a, b] of SKELETON) {
        const p1 = byName.get(a);
        const p2 = byName.get(b);
        if (p1 && p2 && p1.score > 0.25 && p2.score > 0.25) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      for (const [, p] of byName) {
        if (p.score > 0.25) {
          ctx.fillStyle = '#14b8a6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = async (ts: number) => {
      if (!running) return;
      rafId = requestAnimationFrame(tick);

      if (busy || ts - lastTs < minIntervalMs) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      busy = true;
      lastTs = ts;

      try {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const poses = await detector.estimatePoses(video, {
          flipHorizontal: true,
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pose = poses[0];
        if (pose?.keypoints?.length) {
          const kps = pose.keypoints.map((kp, i) => ({
            x: kp.x,
            y: kp.y,
            score: kp.score,
            name: kp.name ?? COCO_KEYPOINT_NAMES[i],
          }));
          drawSkeleton(kps);
          onKeypointsRef.current(kps);
        }
      } catch {
        /* skip bad frame */
      } finally {
        busy = false;
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [video, canvas, detector, enabled]);
}
