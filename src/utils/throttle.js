/**
 * Performance utilities for throttling, debouncing, and batching
 * high-frequency events in the collaborative editor.
 *
 * These are used to limit the rate of WebSocket emissions, DOM
 * manipulations, and React state updates that would otherwise fire
 * on every keystroke / cursor movement — the root cause of the UI
 * stuttering described in Issue #67.
 */

/**
 * Throttle — ensures `fn` runs at most once every `delay` ms.
 * Uses a trailing-edge strategy: if calls arrive while throttled,
 * the last one is queued and executed when the cooldown expires.
 *
 * @param {Function} fn   The function to throttle.
 * @param {number}   delay Minimum interval between invocations (ms).
 * @returns {{ call: Function, cancel: Function }}
 */
export function createThrottle(fn, delay) {
  let lastRun = 0;
  let timer = null;
  let lastArgs = null;

  function call(...args) {
    lastArgs = args;
    const now = Date.now();
    const remaining = delay - (now - lastRun);

    if (remaining <= 0) {
      // Cooldown expired — execute immediately
      if (timer) { clearTimeout(timer); timer = null; }
      lastRun = now;
      fn(...lastArgs);
      lastArgs = null;
    } else if (!timer) {
      // Schedule a trailing invocation
      timer = setTimeout(() => {
        lastRun = Date.now();
        timer = null;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
    // If a timer is already pending, the latest args are stored
    // and will be used when the timer fires.
  }

  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
  }

  return { call, cancel };
}

/**
 * Debounce — delays `fn` until `delay` ms after the last invocation.
 * Every new call resets the timer. Ideal for state snapshots that
 * don't need to update on every single character.
 *
 * @param {Function} fn    The function to debounce.
 * @param {number}   delay Delay in ms after the last call.
 * @returns {{ call: Function, cancel: Function, flush: Function }}
 */
export function createDebounce(fn, delay) {
  let timer = null;
  let lastArgs = null;

  function call(...args) {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...lastArgs);
      lastArgs = null;
    }, delay);
  }

  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
  }

  /** Immediately execute the pending call (if any) and clear the timer. */
  function flush() {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  }

  return { call, cancel, flush };
}
