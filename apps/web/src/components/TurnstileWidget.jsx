import { useEffect, useRef } from 'react';

const SCRIPT_ID = 'cloudflare-turnstile-script';
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const loadScript = () => new Promise((resolve, reject) => {
  if (window.turnstile) return resolve(window.turnstile);
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.onload = () => resolve(window.turnstile);
  script.onerror = reject;
  document.head.appendChild(script);
});

export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!siteKey) {
      if (import.meta.env.DEV) onToken('local-development');
      return undefined;
    }
    let active = true;
    loadScript().then((turnstile) => {
      if (!active || !containerRef.current) return;
      widgetRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
        theme: 'auto',
      });
    }).catch(() => onToken(''));
    return () => {
      active = false;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [onToken]);

  if (!siteKey && !import.meta.env.DEV) return <p className="text-sm text-destructive">Security check is not configured.</p>;
  return <div ref={containerRef} aria-label="Security verification" />;
}
