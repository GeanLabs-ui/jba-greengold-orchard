export const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SCRIPT_ID = 'jba-google-identity-services';

const googleIdentityUnavailable = () => new Error('Google sign-in could not be loaded');

export function loadGoogleIdentityServices({ windowRef = window, documentRef = document, timeoutMs = 10_000 } = {}) {
  if (windowRef.google?.accounts?.id) return Promise.resolve(windowRef.google);

  const existing = documentRef.getElementById(SCRIPT_ID);
  if (existing?.dataset.googleGsiState === 'error') existing.remove();

  const script = documentRef.getElementById(SCRIPT_ID) || documentRef.createElement('script');
  const isNewScript = !script.isConnected;

  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (callback) => {
      if (settled) return;
      settled = true;
      windowRef.clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      callback();
    };
    const onLoad = () => complete(() => {
      script.dataset.googleGsiState = 'ready';
      if (windowRef.google?.accounts?.id) resolve(windowRef.google);
      else reject(googleIdentityUnavailable());
    });
    const onError = () => complete(() => {
      script.dataset.googleGsiState = 'error';
      reject(googleIdentityUnavailable());
    });
    const timeout = windowRef.setTimeout(onError, timeoutMs);

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (isNewScript) {
      script.id = SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset.googleGsiState = 'loading';
      documentRef.head.appendChild(script);
    }
  });
}
