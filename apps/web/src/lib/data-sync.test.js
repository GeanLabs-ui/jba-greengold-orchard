import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishDataChange, subscribeToDataChanges } from './data-sync.js';

class TestCustomEvent extends Event {
  constructor(type, options = {}) {
    super(type);
    this.detail = options.detail;
  }
}

describe('cross-page data synchronization', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(['create', 'delete'])('notifies analytics subscribers when a daily activity is %sd', (action) => {
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
});
