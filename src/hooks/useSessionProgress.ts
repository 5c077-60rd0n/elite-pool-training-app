import { useMemo } from 'react';
import { useSessionStore } from '../store/useSessionStore';

export function useSessionProgress(totalDrills: number) {
  const { drillResults, saveDrillResult, isComplete, markComplete, setSessionNotes, sessionNotes } = useSessionStore();

  const completionPercent = useMemo(() => {
    if (totalDrills <= 0) return 0;
    return Math.round((drillResults.length / totalDrills) * 100);
  }, [drillResults.length, totalDrills]);

  return {
    drillResults,
    completionPercent,
    logDrillResult: saveDrillResult,
    sessionComplete: isComplete,
    saveSession: markComplete,
    sessionNotes,
    setSessionNotes,
  };
}
