import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionSegment } from '../types/models';
import { getSharedAudioContext } from '../utils/mobileAudio';

interface DrillTimerState {
  timeRemaining: number;
  currentSegment: SessionSegment | null;
  segmentTimeRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipSegment: () => void;
}

function beep(freq: number, durationMs: number): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
  }, durationMs);
}

export function useDrillTimer(segments: SessionSegment[], totalSeconds = 60 * 60): DrillTimerState {
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const tickRef = useRef<number | null>(null);

  const segmentBoundaries = useMemo(() => {
    let cursor = 0;
    return segments.map((segment) => {
      const start = cursor;
      const end = cursor + segment.durationMinutes * 60;
      cursor = end;
      return { start, end };
    });
  }, [segments]);

  const elapsed = totalSeconds - timeRemaining;
  const currentSegment = segments[segmentIndex] ?? null;
  const currentBoundary = segmentBoundaries[segmentIndex];
  const segmentTimeRemaining = currentBoundary ? Math.max(0, currentBoundary.end - elapsed) : 0;

  useEffect(() => {
    if (!isRunning) return;
    tickRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          beep(660, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!segmentBoundaries.length) return;
    const nextIndex = segmentBoundaries.findIndex((boundary) => elapsed >= boundary.start && elapsed < boundary.end);
    if (nextIndex >= 0 && nextIndex !== segmentIndex) {
      setSegmentIndex(nextIndex);
      beep(880, 180);
    }
  }, [elapsed, segmentBoundaries, segmentIndex]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(totalSeconds);
    setSegmentIndex(0);
  }, [totalSeconds]);

  const skipSegment = useCallback(() => {
    const nextIndex = Math.min(segmentIndex + 1, segments.length - 1);
    if (nextIndex === segmentIndex) return;
    const nextBoundary = segmentBoundaries[nextIndex];
    if (!nextBoundary) return;
    setSegmentIndex(nextIndex);
    setTimeRemaining(totalSeconds - nextBoundary.start);
    beep(520, 160);
  }, [segmentBoundaries, segmentIndex, segments.length, totalSeconds]);

  return {
    timeRemaining,
    currentSegment,
    segmentTimeRemaining,
    isRunning,
    start,
    pause,
    reset,
    skipSegment,
  };
}
