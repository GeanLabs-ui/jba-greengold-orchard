import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/company-theme.css'
import '@/platform-design.css'
import '@/typography.css'
import '@/platform-consistency.css'
import '@/public-heroes.css'
import '@/mobile-responsive.css'
import '@/card-alignment.css'

async function clearLocalPreviewWorker() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(window.location.hostname) || !('serviceWorker' in navigator)) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const appWorkers = registrations.filter(registration => [registration.active, registration.waiting, registration.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js'));
  const controlled = navigator.serviceWorker.controller && new URL(navigator.serviceWorker.controller.scriptURL).pathname === '/sw.js';
  await Promise.all(appWorkers.map(registration => registration.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('jba-shell-')).map(key => caches.delete(key)));
  }
  if (controlled && !sessionStorage.getItem('jba-dev-worker-cleared')) {
    sessionStorage.setItem('jba-dev-worker-cleared', '1');
    window.location.reload();
    return true;
  }
  return false;
}

clearLocalPreviewWorker().catch(() => false).then(reloading => {
  if (reloading) return;
  ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
