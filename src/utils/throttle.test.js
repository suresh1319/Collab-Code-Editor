/**
 * @file  Unit tests for createThrottle and createDebounce utilities.
 *
 * Coverage goals:
 *   1. Leading-edge immediate invocation
 *   2. Trailing-edge coalescing of burst calls
 *   3. Argument forwarding (latest args win)
 *   4. cancel() drops pending work
 *   5. flush() fires and clears pending debounce
 *   6. pending() introspection
 *   7. Input validation (bad arguments throw)
 *   8. Edge cases: zero-delay, single call, rapid fire, interleaved cancel/flush
 */

import { createThrottle, createDebounce } from './throttle';

// ─── createThrottle ──────────────────────────────────────────────────────────

describe('createThrottle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('fires immediately on the first call (leading edge)', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 100);

    throttle.call('a');

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('a');
  });

  test('coalesces rapid calls and fires the latest on trailing edge', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 100);

    throttle.call('a'); // fires immediately (leading)
    throttle.call('b'); // queued
    throttle.call('c'); // replaces queued args

    expect(cb).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith('c');
  });

  test('allows another immediate call after cooldown expires', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 50);

    throttle.call('first');
    jest.advanceTimersByTime(50);

    throttle.call('second'); // should fire immediately
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith('second');
  });

  test('cancel() drops the pending trailing invocation', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 100);

    throttle.call('a');  // fires (leading)
    throttle.call('b');  // queued
    throttle.cancel();

    jest.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(1); // only the leading call
  });

  test('pending() returns true when a trailing call is queued', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 100);

    expect(throttle.pending()).toBe(false);

    throttle.call('a'); // fires immediately
    expect(throttle.pending()).toBe(false); // no trailing queued yet

    throttle.call('b'); // now a trailing call is queued
    expect(throttle.pending()).toBe(true);

    jest.advanceTimersByTime(100);
    expect(throttle.pending()).toBe(false);
  });

  test('forwards multiple arguments correctly', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 50);

    throttle.call(1, 'two', { three: 3 });
    expect(cb).toHaveBeenCalledWith(1, 'two', { three: 3 });
  });

  test('works with delay = 0 (every call fires)', () => {
    const cb = jest.fn();
    const throttle = createThrottle(cb, 0);

    throttle.call('a');
    throttle.call('b');
    throttle.call('c');

    // With delay 0, each call should see remaining <= 0 and fire immediately
    expect(cb).toHaveBeenCalledTimes(3);
  });

  test('throws on invalid arguments', () => {
    expect(() => createThrottle('not a fn', 100)).toThrow(TypeError);
    expect(() => createThrottle(jest.fn(), -1)).toThrow(TypeError);
    expect(() => createThrottle(jest.fn(), 'fast')).toThrow(TypeError);
  });
});

// ─── createDebounce ──────────────────────────────────────────────────────────

describe('createDebounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('delays invocation until after the quiet period', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 200);

    debounce.call('hello');

    expect(cb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('hello');
  });

  test('resets the timer on each new call (coalesces bursts)', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.call('a');
    jest.advanceTimersByTime(80);
    debounce.call('b'); // resets timer
    jest.advanceTimersByTime(80);
    debounce.call('c'); // resets timer again

    expect(cb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('c');
  });

  test('flush() fires the pending call immediately and clears timer', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 300);

    debounce.call('pending-data');
    debounce.flush();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('pending-data');

    // Should not fire again when the original timer would have elapsed
    jest.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('flush() is a no-op when nothing is pending', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.flush(); // should not throw or call cb
    expect(cb).not.toHaveBeenCalled();
  });

  test('cancel() drops the pending invocation', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.call('will-be-cancelled');
    debounce.cancel();

    jest.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  test('pending() reflects whether an invocation is queued', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    expect(debounce.pending()).toBe(false);

    debounce.call('x');
    expect(debounce.pending()).toBe(true);

    jest.advanceTimersByTime(100);
    expect(debounce.pending()).toBe(false);
  });

  test('pending() returns false after cancel()', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.call('x');
    debounce.cancel();
    expect(debounce.pending()).toBe(false);
  });

  test('forwards multiple arguments correctly', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 50);

    debounce.call('fileId', 'code-content', { meta: true });
    jest.advanceTimersByTime(50);

    expect(cb).toHaveBeenCalledWith('fileId', 'code-content', { meta: true });
  });

  test('can schedule new calls after flush()', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.call('first');
    debounce.flush();
    expect(cb).toHaveBeenCalledTimes(1);

    debounce.call('second');
    jest.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith('second');
  });

  test('can schedule new calls after cancel()', () => {
    const cb = jest.fn();
    const debounce = createDebounce(cb, 100);

    debounce.call('cancelled');
    debounce.cancel();

    debounce.call('after-cancel');
    jest.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('after-cancel');
  });

  test('throws on invalid arguments', () => {
    expect(() => createDebounce(null, 100)).toThrow(TypeError);
    expect(() => createDebounce(jest.fn(), -10)).toThrow(TypeError);
    expect(() => createDebounce(jest.fn(), undefined)).toThrow(TypeError);
  });
});
