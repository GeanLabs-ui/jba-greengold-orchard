import { Hono } from 'hono';
import { describe, it, expect, vi } from 'vitest';
import router from './product-images.js';
import type { AppVariables, AuthUser } from '../middleware/auth.js';

const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
function fixture(role: AuthUser['role'] | null = 'super_admin') {
  const primary = { put: vi.fn().mockResolvedValue({}), get: vi.fn().mockResolvedValue(null), delete: vi.fn().mockResolvedValue(undefined) };
  const backup = { put: vi.fn().mockResolvedValue({}), get: vi.fn().mockResolvedValue(null), delete: vi.fn().mockResolvedValue(undefined) };
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', role ? { id: 'test-user', role, email: 'test@example.com', full_name: 'Test', pageAccess: null, status: 'active', organizationId: null } : null);
    c.set('session', role ? { id: 'test-session', csrfToken: 'test-token', expiresAt: new Date() } : null);
    return next();
  });
  app.route('/images', router);
  const env = { PRIVATE_FILES: primary, PRIVATE_FILES_BACKUP: backup } as unknown as Env;
  const upload = (bytes = png, type = 'image/png', token = 'test-token') => {
    const body = new FormData(); body.append('file', new File([bytes], 'image.png', { type }));
    return app.request('/images', { method: 'POST', body, headers: { 'X-CSRF-Token': token } }, env);
  };
  return { app, env, primary, backup, upload };
}
describe('product images', () => {
  it('stores images in both buckets and serves the saved URL without authentication', async () => {
    const f = fixture(); const response = await f.upload();
    expect(response.status).toBe(201);
    const { data } = await response.json() as { data: { url: string } };
    expect(f.primary.put).toHaveBeenCalledOnce(); expect(f.backup.put).toHaveBeenCalledOnce();
    const publicReader = fixture(null);
    publicReader.primary.get.mockResolvedValue({ body: png, httpMetadata: { contentType: 'image/png' }, httpEtag: 'test-etag' });
    const image = await publicReader.app.request(data.url.replace('/api/v1/product-images', '/images'), {}, publicReader.env);
    expect(image.status).toBe(200); expect(image.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png);
    expect(publicReader.primary.get.mock.calls[0][0]).toMatch(/^public-product-images\//);
  });
  it('blocks unauthenticated, unauthorized and invalid-CSRF uploads', async () => {
    expect((await fixture(null).upload()).status).toBe(401);
    expect((await fixture('customer').upload()).status).toBe(403);
    expect((await fixture().upload(png, 'image/png', 'wrong')).status).toBe(403);
  });
  it('rejects unsupported, oversized and mismatched file contents before storage', async () => {
    const f = fixture();
    expect((await f.upload(png, 'image/svg+xml')).status).toBe(422);
    expect((await f.upload(new Uint8Array([1,2,3]))).status).toBe(422);
    expect((await f.upload(new Uint8Array(5 * 1024 * 1024 + 1))).status).toBe(422);
    expect(f.primary.put).not.toHaveBeenCalled();
  });
  it('cleans both new objects if backup storage fails', async () => {
    const f = fixture(); f.backup.put.mockRejectedValue(new Error('offline'));
    expect((await f.upload()).status).toBe(503);
    expect(f.primary.delete).toHaveBeenCalledOnce(); expect(f.backup.delete).toHaveBeenCalledOnce();
  });
  it('reads from backup and rejects keys outside the public namespace', async () => {
    const f = fixture(null);
    f.backup.get.mockResolvedValue({ body: png, httpMetadata: { contentType: 'image/png' }, httpEtag: 'test' });
    expect((await f.app.request('/images/12345678-1234-4123-8123-123456789abc', {}, f.env)).status).toBe(200);
    expect((await f.app.request('/images/private-file', {}, f.env)).status).toBe(404);
    expect(f.primary.get).toHaveBeenCalledTimes(1);
  });
});
