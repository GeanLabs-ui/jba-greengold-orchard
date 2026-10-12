import { useEffect, useState } from 'react';

export function useGoogleClientId() {
  const [state, setState] = useState({ clientId: null, localLoginEnabled: false, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/auth/config', { signal: controller.signal, credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('Auth configuration unavailable'); return response.json(); })
      .then(body => setState({ clientId: body.data?.googleClientId || null, localLoginEnabled: body.data?.localLoginEnabled === true, loading: false }))
      .catch(() => { if (!controller.signal.aborted) setState({ clientId: null, localLoginEnabled: false, loading: false }); });
    return () => controller.abort();
  }, []);
  return state;
}
