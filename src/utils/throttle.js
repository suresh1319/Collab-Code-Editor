/**
 * Performance utilities for throttling, debouncing, and batching
 * high-frequency events in the collaborative editor.
 *
 * These are used to limit the rate of WebSocket emissions, DOM
 * manipulations, and React state updates that would otherwise fire
 * on every keystroke / cursor movement — the root cause of the UI
 * stuttering described in Issue #67.
 *
 * Design decisions:
 * ─────────────────
 * • createThrottle uses a **leading + trailing** strategy: the first
 *   call always fires immediately (leading edge) and the last call
 *   within a cooldown window is queued for the trailing edge. This
 *   ensures the UI never feels "laggy" on the first interaction while
 *   still coalescing bursts.
 *
 * • createDebounce uses a **trailing-only** strategy with explicit
 *   flush / cancel support, ideal for state snapshots that should
 *   trail user activity.
 *
 * • Both utilities are framework-agnostic (pure JS, no React deps)
 *   so they can be reused on the server or in Web Workers.
 */

/**
 * Throttle — ensures `fn` runs at most once every `delay` ms.
 * Uses a leading + trailing-edge strategy: the first call in each window
 * fires immediately; subsequent calls within the cooldown are coalesced
 * and the latest is executed when the cooldown expires.
 *
 * @param {Function} fn    The function to throttle.
 * @param {number}   delay Minimum interval between invocations (ms).
 * @returns {{ call: Function, cancel: Function, pending: () => boolean }}
 */
export function createThrottle(fn, delay) {
  if (typeof fn !== 'function') {
    throw new TypeError('createThrottle: first argument must be a function');
  }
  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('createThrottle: delay must be a non-negative number');
  }

  let lastRun = 0;
  let timer = null;
  let lastArgs = null;

  function call(...args) {
    lastArgs = args;
    const now = Date.now();
    const remaining = delay - (now - lastRun);

    if (remaining <= 0) {
      // Cooldown expired — execute immediately (leading edge)
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
    // and will be used when the timer fires (trailing edge).
  }

  /** Cancel the pending trailing invocation (if any). */
  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
  }

  /** Returns true if there is a queued trailing invocation. */
  function pending() {
    return timer !== null;
  }

  return { call, cancel, pending };
}

/**
 * Debounce — delays `fn` until `delay` ms after the last invocation.
 * Every new call resets the timer. Ideal for state snapshots that
 * don't need to update on every single character.
 *
 * @param {Function} fn    The function to debounce.
 * @param {number}   delay Delay in ms after the last call.
 * @returns {{ call: Function, cancel: Function, flush: Function, pending: () => boolean }}
 */
export function createDebounce(fn, delay) {
  if (typeof fn !== 'function') {
    throw new TypeError('createDebounce: first argument must be a function');
  }
  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('createDebounce: delay must be a non-negative number');
  }

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

  /** Cancel the pending invocation and discard captured arguments. */
  function cancel() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
  }

  /**
   * Immediately execute the pending call (if any) and clear the timer.
   * No-op if nothing is pending — safe to call unconditionally during
   * component cleanup.
   */
  function flush() {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  }

  /** Returns true if there is a pending invocation waiting to fire. */
  function pending() {
    return timer !== null;
  }

  return { call, cancel, flush, pending };
}
