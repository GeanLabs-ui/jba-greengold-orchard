const LEGACY_KEY = 'jba:issues-preview:v1';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('jba-issues', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Issue storage could not be opened. Check browser storage permissions.'));
  });
}

export async function saveIssues(records) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('records', 'readwrite');
      transaction.objectStore('records').put(records, 'issues');
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(new Error(transaction.error?.name === 'QuotaExceededError'
        ? 'Browser storage is full. Free storage space and retry; your form has been kept open.'
        : 'Issue could not be saved. Check browser storage permissions and retry.'));
      transaction.onerror = () => {};
    });
  } finally {
    database.close();
  }
}

export async function loadIssues(fallback) {
  const database = await openDatabase();
  let records;
  try {
    records = await new Promise((resolve, reject) => {
      const request = database.transaction('records').objectStore('records').get('issues');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Saved issues could not be loaded. Refresh and retry.'));
    });
  } finally {
    database.close();
  }
  if (records !== undefined) return records;
  const legacy = localStorage.getItem(LEGACY_KEY);
  records = legacy ? JSON.parse(legacy) : fallback;
  if (!Array.isArray(records)) throw new Error('Saved issue data is invalid. Existing data has been preserved.');
  await saveIssues(records);
  return records;
}
