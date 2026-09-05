import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ok = (data) => Response.json({ data });
const rejected = (code = 'CSRF_INVALID', status = 403) => Response.json({ error: { code, message: code } }, { status });
const session = (token, id = 'customer-a') => ({ user: { id }, csrf_token: token });

describe('authenticated request security-token recovery', () => {
  let api;
  let fetchMock;
  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api = (await import('./base44Client.js')).base44;
    fetchMock.mockResolvedValueOnce(ok(session('old-token')));
    await api.auth.me();
    fetchMock.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('refreshes a stale token and replays the same multipart document once', async () => {
    const attempts = [];
    fetchMock.mockImplementation(async (url, options) => {
      if (url.endsWith('/auth/me')) {
        expect(options.cache).toBe('no-store');
        return ok(session('new-token'));
      }
      attempts.push({ token: options.headers.get('X-CSRF-Token'), body: options.body });
      expect(options.headers.has('Content-Type')).toBe(false);
      return attempts.length === 1 ? rejected() : ok({ id: 'uploaded-document' });
    });
    const document = new File(['synthetic document'], 'test.pdf', { type: 'application/pdf' });
    await expect(api.account.upload(document, 'document')).resolves.toEqual({ id: 'uploaded-document' });
    expect(attempts.map(({ token }) => token)).toEqual(['old-token', 'new-token']);
    expect(attempts[1].body).toBe(attempts[0].body);
    expect(attempts[1].body.get('purpose')).toBe('document');
    expect(await attempts[1].body.get('file').text()).toBe('synthetic document');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries verification with unchanged identity, documents, and consent', async () => {
    const input = { identity: { legalName: 'Synthetic Customer' }, documentIds: ['front', 'back'], consent: true };
    fetchMock.mockResolvedValueOnce(rejected()).mockResolvedValueOnce(ok(session('new-token'))).mockResolvedValueOnce(ok({ status: 'pending' }));
    await expect(api.account.submit(input)).resolves.toEqual({ status: 'pending' });
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(input));
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify(input));
    expect(fetchMock.mock.calls[2][1].headers.get('X-CSRF-Token')).toBe('new-token');
  });

  it('never retries documents under a different signed-in account, even on another attempt', async () => {
    fetchMock.mockResolvedValueOnce(rejected()).mockResolvedValueOnce(ok(session('other-token', 'customer-b')));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValueOnce(ok(session('other-token', 'customer-b')));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/account/verification'))).toHaveLength(1);
  });

  it('stops after one recovery attempt when the refreshed token is rejected', async () => {
    fetchMock.mockResolvedValueOnce(rejected()).mockResolvedValueOnce(ok(session('new-token'))).mockResolvedValueOnce(rejected()).mockResolvedValue(ok({}));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ code: 'CSRF_INVALID' });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/account/verification'))).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/me'))).toHaveLength(1);
  });

  it('keeps the form owner after a client reload clears the token cache', async () => {
    vi.resetModules();
    const reloadedApi = (await import('./base44Client.js')).base44;
    fetchMock.mockResolvedValueOnce(ok(session('other-token', 'customer-b')));
    await expect(reloadedApi.account.submit({ consent: true }, 'customer-a')).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/me$/);
  });

  it('rejects a form owner that differs from the known signed-in account before sending', async () => {
    await expect(api.account.submit({ consent: true }, 'customer-b')).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not replay a request after session expiry', async () => {
    fetchMock.mockResolvedValueOnce(rejected()).mockResolvedValueOnce(rejected('UNAUTHORIZED', 401));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([['FORBIDDEN', 403], ['SERVER_ERROR', 500], ['VALIDATION_ERROR', 422]])('does not retry %s', async (code, status) => {
    fetchMock.mockResolvedValueOnce(rejected(code, status)).mockResolvedValue(ok({}));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ code });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/account/verification'))).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/me'))).toBe(false);
  });

  it('does not retry an uncertain network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network interrupted'));
    await expect(api.account.submit({ consent: true })).rejects.toMatchObject({ code: 'API_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
