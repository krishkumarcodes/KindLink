'use client';

import { useState, useEffect, useRef } from 'react';

type TickListener = (timestamp: number) => void;

interface ListenerRegistration {
  callback: TickListener;
  intervalMs: number;
  lastTick: number;
}

interface SharedTickerState {
  listeners: Set<ListenerRegistration>;
  masterTimerId: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
  isPaused: boolean;
}

const tickerState: SharedTickerState = {
  listeners: new Set(),
  masterTimerId: null,
  isRunning: false,
  isPaused: false,
};

/**
 * Executes a tick cycle across all registered listeners whose
 * requested interval has elapsed. Pauses automatically if document is hidden.
 */
function runMasterTick() {
  if (typeof document === 'undefined') return;
  if (document.hidden || tickerState.isPaused) return;

  const now = Date.now();
  for (const item of tickerState.listeners) {
    if (now - item.lastTick >= item.intervalMs - 40) {
      item.lastTick = now;
      try {
        item.callback(now);
      } catch (err) {
        console.error('[SharedTicker callback error]', err);
      }
    }
  }
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;

  if (document.hidden) {
    tickerState.isPaused = true;
  } else {
    tickerState.isPaused = false;
    // Wake-up immediately on foreground return
    runMasterTick();
  }
}

function ensureMasterTickerStarted() {
  if (typeof window === 'undefined') return;
  if (tickerState.isRunning) return;

  tickerState.isRunning = true;
  tickerState.isPaused = typeof document !== 'undefined' ? document.hidden : false;

  // Master 1-second pulse for alignment
  tickerState.masterTimerId = setInterval(runMasterTick, 1000);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
}

function stopMasterTickerIfEmpty() {
  if (tickerState.listeners.size === 0 && tickerState.isRunning) {
    if (tickerState.masterTimerId) {
      clearInterval(tickerState.masterTimerId);
      tickerState.masterTimerId = null;
    }
    tickerState.isRunning = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }
}

/**
 * Unified Shared Ticker Hook:
 * Unifies scattered setInterval timers across the application (e.g. 'updated 14s ago',
 * waiting duration tickers, live elapsed timers).
 *
 * Automatically pauses ticking when document.hidden is true (tab minimized/backgrounded),
 * saving CPU cycles and mobile battery life. Wakes immediately on tab focus.
 *
 * @param intervalMs Desired tick resolution in milliseconds (default: 1000ms)
 * @param enabled Whether ticking is active for this consumer (default: true)
 * @returns Current timestamp in ms (Date.now())
 */
export function useSharedTicker(intervalMs: number = 1000, enabled: boolean = true): number {
  const [timestamp, setTimestamp] = useState(() => (typeof Date !== 'undefined' ? Date.now() : 0));
  const callbackRef = useRef<TickListener>((t: number) => {
    setTimestamp(t);
  });

  callbackRef.current = (t: number) => {
    setTimestamp(t);
  };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    ensureMasterTickerStarted();

    const registration: ListenerRegistration = {
      callback: (t: number) => callbackRef.current(t),
      intervalMs,
      lastTick: Date.now(),
    };

    tickerState.listeners.add(registration);

    // Initial sync
    setTimestamp(Date.now());

    return () => {
      tickerState.listeners.delete(registration);
      stopMasterTickerIfEmpty();
    };
  }, [intervalMs, enabled]);

  return timestamp;
}

export default useSharedTicker;
