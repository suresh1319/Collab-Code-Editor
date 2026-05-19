export function createLatestValueScheduler(callback, delayMs) {
  let timeoutId = null;
  let hasPendingValue = false;
  let latestValue;

  const deliverLatest = () => {
    if (!hasPendingValue) return;
    const value = latestValue;
    hasPendingValue = false;
    latestValue = undefined;
    callback(value);
  };

  return {
    schedule(value) {
      latestValue = value;
      hasPendingValue = true;

      if (timeoutId !== null) return;

      timeoutId = setTimeout(() => {
        timeoutId = null;
        deliverLatest();
      }, delayMs);
    },

    flush() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      deliverLatest();
    },

    cancel() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      hasPendingValue = false;
      latestValue = undefined;
    },
  };
}
