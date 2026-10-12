import { describe, expect, it } from 'vitest';
import { GOOGLE_IDENTITY_SCRIPT_URL, loadGoogleIdentityServices } from './google-identity';

function fakeDom() {
  const scripts = new Map();
  const documentRef = {
    createElement: () => {
      const listeners = new Map();
      return {
        async: false,
        dataset: {},
        defer: false,
        id: '',
        isConnected: false,
        src: '',
        addEventListener: (event, callback) => listeners.set(event, callback),
        removeEventListener: (event) => listeners.delete(event),
        remove: () => { scripts.delete(SCRIPT_ID); },
        dispatch: (event) => listeners.get(event)?.(),
      };
    },
    getElementById: (id) => scripts.get(id),
    head: { appendChild: (script) => { script.isConnected = true; scripts.set(script.id, script); } },
  };
  const windowRef = { clearTimeout, setTimeout };
  return { documentRef, scripts, windowRef };
}

const SCRIPT_ID = 'jba-google-identity-services';

describe('loadGoogleIdentityServices', () => {
  it('replaces a failed script instead of waiting forever on a stale error element', async () => {
    const { documentRef, scripts, windowRef } = fakeDom();
    const stale = documentRef.createElement('script');
    stale.id = SCRIPT_ID;
    stale.isConnected = true;
    stale.dataset.googleGsiState = 'error';
    scripts.set(SCRIPT_ID, stale);

    const pending = loadGoogleIdentityServices({ documentRef, windowRef, timeoutMs: 50 });
    const replacement = scripts.get(SCRIPT_ID);
    expect(replacement).not.toBe(stale);
    expect(replacement.src).toBe(GOOGLE_IDENTITY_SCRIPT_URL);
    replacement.dispatch('error');
    await expect(pending).rejects.toThrow('Google sign-in could not be loaded');
  });
});
