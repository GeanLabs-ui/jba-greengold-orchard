import { describe, expect, it, vi } from 'vitest';
import { activateCardSurface } from './card-surface';

function fixture({ control = false, nested = false, selection = '', disabled = false, primary = true } = {}) {
  const action = { click: vi.fn(), matches: () => disabled, tagName: 'A', dispatchEvent: vi.fn() };
  const card = { querySelectorAll: () => primary ? [action] : [], ownerDocument: { defaultView: {
    getSelection: () => ({ toString: () => selection }),
    MouseEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
  } } };
  action.closest = () => card;
  const event = { button: 0, currentTarget: card, target: {
    closest: selector => selector === '[data-card-surface]' ? nested ? {} : card : control ? {} : null,
  } };
  return { action, event };
}

describe('whole card primary action', () => {
  it('opens the designated action when clicking text or empty card space', () => {
    const { action, event } = fixture();
    activateCardSurface(event);
    expect(action.click).toHaveBeenCalledOnce();
  });

  it('leaves links, toggles, buttons and other embedded controls to their own handlers', () => {
    const { action, event } = fixture({ control: true });
    activateCardSurface(event);
    expect(action.click).not.toHaveBeenCalled();
  });

  it.each([{ nested: true }, { selection: 'Selected text' }, { disabled: true }, { primary: false }])('does not hijack non-card interactions: %j', (options) => {
    const { action, event } = fixture(options);
    activateCardSurface(event);
    expect(action.click).not.toHaveBeenCalled();
  });

  it.each([{ button: 2 }, { defaultPrevented: true }])('respects cancelled events and secondary clicks', (overrides) => {
    const { action, event } = fixture();
    activateCardSurface({ ...event, ...overrides });
    expect(action.click).not.toHaveBeenCalled();
  });

  it('preserves modifier keys when opening a card link', () => {
    const { action, event } = fixture();
    activateCardSurface({ ...event, ctrlKey: true });
    expect(action.click).not.toHaveBeenCalled();
    expect(action.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'click', ctrlKey: true, bubbles: true }));
  });

  it('does not invoke button actions with navigation modifier keys', () => {
    const { action, event } = fixture();
    action.tagName = 'BUTTON';
    activateCardSurface({ ...event, metaKey: true });
    expect(action.click).not.toHaveBeenCalled();
    expect(action.dispatchEvent).not.toHaveBeenCalled();
  });

  it('does not borrow an action from a nested card', () => {
    const { action, event } = fixture();
    action.closest = () => ({});
    activateCardSurface(event);
    expect(action.click).not.toHaveBeenCalled();
  });
});
