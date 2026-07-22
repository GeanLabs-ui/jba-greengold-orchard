const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 600_000;

export const SESSION_COOKIE = '__Host-jba_session';
export const LOCAL_SESSION_COOKIE = 'jba_session';

export function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function hashPassword(password: string, salt = randomToken(16)): Promise<{ hash: string; salt: string }> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return { hash: toBase64(new Uint8Array(bits)), salt };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  const [left, right] = [fromBase64(actual.hash), fromBase64(expectedHash)];
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    cookies.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return cookies;
}

export function sessionCookie(token: string, secure: boolean, maxAgeSeconds = 60 * 60 * 12): string {
  const secureAttribute = secure ? '; Secure' : '';
  const name = secure ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secureAttribute}; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(secure: boolean): string {
  return sessionCookie('', secure, 0);
}
