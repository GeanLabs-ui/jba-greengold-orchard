import { getSafeRedirectTarget } from './safe-redirect';

export function loginDestination(searchParams, staffPath = false) {
  const target = getSafeRedirectTarget(searchParams.get('from_url'), '/portal');
  const staff = staffPath || /^\/admin(?:[/?#]|$)/.test(target);
  return { audience: staff ? 'staff' : 'customer', target: staff && !/^\/admin(?:[/?#]|$)/.test(target) ? '/admin' : target };
}

export function customerDestination(value) {
  const target = getSafeRedirectTarget(value, '/portal');
  return /^\/(?:admin|login|register|staff-login)(?:[/?#]|$)/.test(target) ? '/portal' : target;
}
