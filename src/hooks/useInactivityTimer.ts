import { useEffect, useRef, useState } from 'react';

interface UseInactivityTimerOptions {
  timeout: number; // in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export function useInactivityTimer({ timeout, onTimeout, enabled = true }: UseInactivityTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    setTimeRemaining(null);

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (finalTimeoutRef.current) {
      clearTimeout(finalTimeoutRef.current);
      finalTimeoutRef.current = null;
    }

    // Set new timeout - after 5 minutes of inactivity, show countdown
    timeoutRef.current = setTimeout(() => {
      // Start countdown (30 seconds warning before logout)
      const countdownDuration = 30000; // 30 seconds
      setTimeRemaining(countdownDuration);

      // Set final timeout for actual logout
      finalTimeoutRef.current = setTimeout(() => {
        onTimeout();
      }, countdownDuration);

      countdownRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1000) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            if (finalTimeoutRef.current) {
              clearTimeout(finalTimeoutRef.current);
              finalTimeoutRef.current = null;
            }
            onTimeout();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }, timeout); // Show countdown after full timeout period (5 minutes)
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (finalTimeoutRef.current) {
        clearTimeout(finalTimeoutRef.current);
      }
    };
  }, [timeout, onTimeout, enabled]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return {
    timeRemaining,
    formatTime,
    resetTimer,
  };
}

