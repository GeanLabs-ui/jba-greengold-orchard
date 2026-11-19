const interactiveSelector = 'form, a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="tab"], [role="menuitem"], [contenteditable="true"], [data-card-ignore]';

// Cards explicitly designate their existing open/view action. All other controls
// retain their own behavior, including controls inside nested cards.
export function activateCardSurface(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  const card = event.currentTarget;
  const target = event.target?.closest ? event.target : event.target?.parentElement;
  if (!target || target.closest('[data-card-surface]') !== card || target.closest(interactiveSelector)) return;
  if (card.ownerDocument.defaultView.getSelection()?.toString()) return;
  const primary = [...card.querySelectorAll('[data-card-primary]')]
    .find(action => action.closest('[data-card-surface]') === card);
  if (!primary || primary.matches(':disabled, [aria-disabled="true"]')) return;
  const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
  if (modified) {
    if (primary.tagName !== 'A') return;
    const MouseEvent = card.ownerDocument.defaultView.MouseEvent;
    primary.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: card.ownerDocument.defaultView,
      ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey,
    }));
  } else {
    primary.click();
  }
}
