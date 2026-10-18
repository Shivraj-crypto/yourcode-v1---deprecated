import { useState, useCallback, useRef, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  return { toast, showToast };
}

export function useTimer(initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const toggle = useCallback(() => setRunning(r => !r), []);
  const reset = useCallback(() => { setSeconds(0); setRunning(false); }, []);
  const restore = useCallback((value, shouldRun = false) => {
    setSeconds(Math.max(0, Number(value) || 0));
    setRunning(Boolean(shouldRun));
  }, []);

  const format = useCallback((s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }, []);

  return { seconds, running, toggle, reset, restore, formatted: format(seconds) };
}
