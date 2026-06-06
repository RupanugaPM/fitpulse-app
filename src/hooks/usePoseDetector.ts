import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export function usePoseDetector() {
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await tf.ready();
        try {
          await tf.setBackend('webgl');
          await tf.ready();
        } catch {
          await tf.setBackend('cpu');
          await tf.ready();
        }

        if (cancelled) return;

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );

        if (!cancelled) {
          detectorRef.current = detector;
          setDetector(detector);
          setBackend(tf.getBackend());
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load AI model. Try refreshing the page.'
          );
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      detectorRef.current?.dispose();
      detectorRef.current = null;
      setDetector(null);
    };
  }, []);

  return { detector, detectorRef, loading, error, backend };
}
