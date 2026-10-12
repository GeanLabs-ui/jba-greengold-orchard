import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishDataChange, subscribeToDataChanges } from './data-sync.js';

class TestCustomEvent extends Event {
  constructor(type, options = {}) {
    super(type);
    this.detail = options.detail;
  }
}

describe('cross-page data synchronization', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each(['create', 'update', 'delete'])('notifies analytics subscribers when a daily activity is %sd', (action) => {
    const browserWindow = new EventTarget();
    browserWindow.localStorage = { setItem: vi.fn() };
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal('localStorage', browserWindow.localStorage);
    vi.stubGlobal('CustomEvent', TestCustomEvent);
    const handler = vi.fn();
    const unsubscribe = subscribeToDataChanges(handler, ['DailyActivity']);

    publishDataChange('DailyActivity', action, 'activity-1');

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'DailyActivity',
      action,
      recordId: 'activity-1',
    }));
    unsubscribe();
  });
  it('refreshes on tab return and periodically, skips hidden tabs, and removes listeners on cleanup', () => {
    vi.useFakeTimers();
    const browserWindow = new EventTarget();
    browserWindow.setInterval = setInterval;
    browserWindow.clearInterval = clearInterval;
    const browserDocument = new EventTarget();
    browserDocument.visibilityState = 'visible';
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal('document', browserDocument);
    const handler = vi.fn();
    const unsubscribe = subscribeToDataChanges(handler, ['DailyActivity'], { refreshOnFocus: true, refreshIntervalMs: 60000 });
    browserWindow.dispatchEvent(new Event('focus'));
    expect(handler).toHaveBeenCalledTimes(1);
    browserDocument.visibilityState = 'hidden';
    vi.advanceTimersByTime(60000);
    expect(handler).toHaveBeenCalledTimes(1);
    browserDocument.visibilityState = 'visible';
    browserDocument.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60000);
    expect(handler).toHaveBeenCalledTimes(3);
    unsubscribe();
    browserWindow.dispatchEvent(new Event('focus'));
    browserDocument.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60000);
    expect(handler).toHaveBeenCalledTimes(3);
  });
});
