const DATA_CHANGED_EVENT = 'jba:data-changed';
const DATA_CHANGED_STORAGE_KEY = 'jba:data-changed-at';

export function publishDataChange(entity, action = 'update', recordId = null) {
  if (typeof window === 'undefined') return;
  const detail = { entity, action, recordId, timestamp: Date.now() };
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }));
  try {
    localStorage.setItem(DATA_CHANGED_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // The current-tab event still keeps the UI synchronized when storage is unavailable.
  }
}

export function subscribeToDataChanges(handler, entities = []) {
  if (typeof window === 'undefined') return () => {};
  const accepted = new Set(entities);
  const shouldHandle = (detail) => !accepted.size || accepted.has(detail?.entity);
  const onLocalChange = (event) => {
    if (shouldHandle(event.detail)) handler(event.detail);
  };
  const onStorageChange = (event) => {
    if (event.key !== DATA_CHANGED_STORAGE_KEY || !event.newValue) return;
    try {
      const detail = JSON.parse(event.newValue);
      if (shouldHandle(detail)) handler(detail);
    } catch {
      // Ignore malformed cross-tab messages.
    }
  };

  window.addEventListener(DATA_CHANGED_EVENT, onLocalChange);
  window.addEventListener('storage', onStorageChange);
  return () => {
    window.removeEventListener(DATA_CHANGED_EVENT, onLocalChange);
    window.removeEventListener('storage', onStorageChange);
  };
}
