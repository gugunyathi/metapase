import { useEffect, useRef, useState } from 'react';
import { GeoPoint } from '../types/metapase';
import { haversineM } from '../lib/geo';

const MIN_SAMPLE_S = 0.35;
const MAX_SPEED_MPS = 8;
const IDLE_MS = 2500;
const MOVE_EPSILON_M = 0.25;

export function useMotionSpeed(point: GeoPoint | null, reportedSpeedMps: number | null): number {
  const [speed, setSpeed] = useState<number>(0);
  const sampleRef = useRef<{ point: GeoPoint; at: number } | null>(null);
  const lastMoveRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (reportedSpeedMps !== null && Number.isFinite(reportedSpeedMps)) {
      const value = Math.min(Math.max(reportedSpeedMps, 0), MAX_SPEED_MPS);
      if (value > 0.2) lastMoveRef.current = now;
      setSpeed(prev => prev * 0.5 + value * 0.5);
      return;
    }
    if (!point) return;
    const sample = sampleRef.current;
    if (!sample) {
      sampleRef.current = { point, at: now };
      return;
    }
    const elapsedS = (now - sample.at) / 1000;
    if (elapsedS < MIN_SAMPLE_S) return;
    const moved = haversineM(sample.point, point);
    sampleRef.current = { point, at: now };
    if (moved < MOVE_EPSILON_M) return;
    lastMoveRef.current = now;
    const instant = Math.min(moved / elapsedS, MAX_SPEED_MPS);
    setSpeed(prev => prev * 0.55 + instant * 0.45);
  }, [point, reportedSpeedMps]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() - lastMoveRef.current > IDLE_MS) setSpeed(prev => (prev < 0.05 ? 0 : prev * 0.6));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return speed;
}
