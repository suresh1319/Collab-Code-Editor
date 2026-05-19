import { createLatestValueScheduler } from './latestValueScheduler';

describe('createLatestValueScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('delivers only the latest scheduled value once per delay window', () => {
    const callback = jest.fn();
    const scheduler = createLatestValueScheduler(callback, 50);

    scheduler.schedule('first');
    scheduler.schedule('second');
    scheduler.schedule('third');

    jest.advanceTimersByTime(50);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });

  test('flush delivers the latest pending value immediately', () => {
    const callback = jest.fn();
    const scheduler = createLatestValueScheduler(callback, 50);

    scheduler.schedule('pending');
    scheduler.flush();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('pending');

    jest.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('cancel drops pending work', () => {
    const callback = jest.fn();
    const scheduler = createLatestValueScheduler(callback, 50);

    scheduler.schedule('pending');
    scheduler.cancel();
    jest.advanceTimersByTime(50);

    expect(callback).not.toHaveBeenCalled();
  });
});
