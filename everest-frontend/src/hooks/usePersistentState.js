import { useState, useEffect, useRef } from 'react';

/**
 * usePersistentState — drop-in replacement for useState that persists to
 * localStorage. Survives APK rebuilds, page reloads, and app restarts.
 *
 * @param {string} key        - unique localStorage key
 * @param {*}      defaultVal - initial value if nothing is stored yet
 */
const usePersistentState = (key, defaultVal) => {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn(`[Persist] Failed to load "${key}":`, e);
    }
    return defaultVal;
  });

  // Avoid writing on first render (value already came from storage)
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`[Persist] Failed to save "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState];
};

export default usePersistentState;
