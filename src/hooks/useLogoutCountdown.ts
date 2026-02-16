import { useState, useEffect, useRef } from 'react';

interface UseLogoutCountdownOptions {
  countdownDuration?: number; // in milliseconds, default 5 seconds
  onComplete: () => void;
}

export function useLogoutCountdown({ 
  countdownDuration = 5000, 
  onComplete 
}: UseLogoutCountdownOptions) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCountdown = () => {
    setIsActive(true);
    setTimeRemaining(countdownDuration);

    // Clear any existing timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set final timeout for actual logout
    timeoutRef.current = setTimeout(() => {
      onComplete();
      setIsActive(false);
      setTimeRemaining(null);
    }, countdownDuration);

    // Update countdown every second
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1000) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    setIsActive(false);
    setTimeRemaining(null);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return {
    timeRemaining,
    isActive,
    startCountdown,
    cancelCountdown,
    formatTime,
  };
}

