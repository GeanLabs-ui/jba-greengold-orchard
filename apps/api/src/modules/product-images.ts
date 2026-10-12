import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { requireAuth, requireCsrf, type AppVariables } from '../middleware/auth.js';
import { canWrite } from './entities.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const prefix = 'public-product-images/';

export function validProductImage(type: string, bytes: Uint8Array): boolean {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

router.post('/', requireAuth(), requireCsrf(), async (c, next) => {
  if (!canWrite(c.get('user'), 'Product')) return c.json({ error: { code: 'FORBIDDEN', message: 'Product editing access required.' } }, 403);
  return next();
}, bodyLimit({ maxSize: MAX_IMAGE_SIZE + 64 * 1024 }), async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !imageTypes.has(file.type) || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return c.json({ error: { code: 'INVALID_IMAGE', message: 'Choose a JPG, PNG, or WebP image up to 5 MB.' } }, 422);
  }
  const body = await file.arrayBuffer();
  if (!validProductImage(file.type, new Uint8Array(body, 0, Math.min(12, body.byteLength)))) {
    return c.json({ error: { code: 'INVALID_IMAGE', message: 'The file contents do not match the image type.' } }, 422);
  }
  const id = crypto.randomUUID();
  const key = `${prefix}${id}`;
  const metadata = { httpMetadata: { contentType: file.type }, customMetadata: { ownerUserId: c.get('user')!.id } };
  const results = await Promise.allSettled([
    c.env.PRIVATE_FILES.put(key, body, metadata),
    c.env.PRIVATE_FILES_BACKUP.put(key, body, metadata),
  ]);
  if (results.some(result => result.status === 'rejected')) {
    await Promise.allSettled([c.env.PRIVATE_FILES.delete(key), c.env.PRIVATE_FILES_BACKUP.delete(key)]);
    return c.json({ error: { code: 'UPLOAD_FAILED', message: 'Image upload failed. Please try again.' } }, 503);
  }
  return c.json({ data: { url: `/api/v1/product-images/${id}` } }, 201);
});

// Only this dedicated image namespace is public; document/account storage stays private.
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return c.notFound();
  const key = `${prefix}${id}`;
  const object = await c.env.PRIVATE_FILES.get(key) || await c.env.PRIVATE_FILES_BACKUP.get(key);
  if (!object || !imageTypes.has(object.httpMetadata?.contentType || '')) return c.notFound();
  return new Response(object.body, { headers: {
    'Content-Type': object.httpMetadata!.contentType!,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': object.httpEtag,
  } });
});

export default router;
