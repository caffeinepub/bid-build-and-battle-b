/**
 * useTimer — countdown timer hook for live auction.
 *
 * @param initialSeconds  Starting value (default 30)
 * @param isRunning       Whether the timer should be ticking
 * @param resetKey        Change this value to reset the timer to initialSeconds
 */

import { useEffect, useRef, useState } from "react";

interface UseTimerResult {
  timeLeft: number;
  isExpired: boolean;
  percentRemaining: number;
}

export function useTimer(
  initialSeconds = 30,
  isRunning = false,
  resetKey: number | string = 0,
): UseTimerResult {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when resetKey or initialSeconds changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is intentionally a reset trigger
  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [resetKey, initialSeconds]);

  // Tick interval — runs while isRunning is true, resets when resetKey changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is intentionally a reset trigger
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, resetKey]);

  const isExpired = timeLeft <= 0;
  const percentRemaining =
    initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0;

  return { timeLeft, isExpired, percentRemaining };
}
