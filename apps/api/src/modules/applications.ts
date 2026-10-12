import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { checkRateLimit, requestIp } from '../rate-limit.js';
import { verifyTurnstile } from '../turnstile.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const fileFields = ['resume', 'coverLetter', 'certificate'] as const;

function validFile(file: File): boolean {
  const allowed = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);
  return file.size > 0 && file.size <= MAX_FILE_SIZE && allowed.has(file.type);
}

async function validSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return !bytes.includes(0);
}

router.post('/', async (c) => {
  const form = await c.req.formData();
  const ip = requestIp(c.req.raw);
  if (!await verifyTurnstile(c.env, String(form.get('turnstileToken') || ''), ip)) return c.json({ error: { code: 'BOT_CHECK_FAILED', message: 'Please complete the security check' }, requestId: c.get('requestId') }, 403);
  const sql = createDatabase(c.env);
  const uploadedKeys: string[] = [];
  try {
    const rate = await checkRateLimit(sql, 'career-application', ip, 3, 3600);
    if (!rate.allowed) {
      c.header('Retry-After', String(rate.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many applications' }, requestId: c.get('requestId') }, 429);
    }
    const email = String(form.get('email') || '').trim().toLowerCase();
    const candidateName = String(form.get('candidateName') || '').trim();
    const roleAppliedFor = String(form.get('roleAppliedFor') || '').trim();
    if (!candidateName || !roleAppliedFor || !/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Required application details are invalid' }, requestId: c.get('requestId') }, 422);

    const applicationId = crypto.randomUUID();
    const fileData: Record<string, string | undefined> = {};
    for (const field of fileFields) {
      const value = form.get(field);
      if (!(value instanceof File)) continue;
      if (!validFile(value) || !await validSignature(value)) return c.json({ error: { code: 'INVALID_FILE', message: `${field} has an unsupported type or signature` }, requestId: c.get('requestId') }, 422);
      const fileId = crypto.randomUUID();
      const objectKey = `applications/${applicationId}/${fileId}`;
      await c.env.PRIVATE_FILES.put(objectKey, value.stream(), { httpMetadata: { contentType: 'application/octet-stream', contentDisposition: `attachment; filename="download"` }, customMetadata: { originalName: value.name } });
      uploadedKeys.push(objectKey);
      fileData[`${field === 'coverLetter' ? 'cover_letter' : field}_file_name`] = value.name;
      fileData[`${field === 'coverLetter' ? 'cover_letter' : field}_file_url`] = `/api/v1/files/${fileId}`;
      fileData[`${field === 'coverLetter' ? 'cover_letter' : field}_file_id`] = fileId;
    }
    const data = {
      application_number: `APP-${applicationId.slice(0, 8).toUpperCase()}`,
      candidate_name: candidateName.slice(0, 200), email, phone: String(form.get('phone') || '').slice(0, 50),
      role_applied_for: roleAppliedFor.slice(0, 200), candidate_summary: String(form.get('summary') || '').slice(0, 5000),
      status: 'new', source: 'Careers page', ...fileData,
    };
    await sql.begin(async (transaction) => {
      await transaction`INSERT INTO entity_records (id, entity_name, data) VALUES (${applicationId}, 'JobApplication', ${sql.json(data)})`;
      for (const field of fileFields) {
        const prefix = field === 'coverLetter' ? 'cover_letter' : field;
        const fileId = fileData[`${prefix}_file_id`];
        const objectKey = uploadedKeys.find((key) => key.endsWith(`/${fileId}`));
        const originalFile = form.get(field);
        if (!fileId || !objectKey || !(originalFile instanceof File)) continue;
        const originalName = fileData[`${prefix}_file_name`] || 'download';
        await transaction`INSERT INTO file_objects (id, object_key, original_name, content_type, size_bytes, record_id, status)
          VALUES (${fileId}, ${objectKey}, ${originalName}, ${originalFile.type}, ${originalFile.size}, ${applicationId}, 'active')`;
      }
      await transaction`INSERT INTO audit_events (id, action, target_table, record_id, new_values, ip_address) VALUES (${crypto.randomUUID()}, 'public_apply', 'JobApplication', ${applicationId}, ${sql.json({ email, role_applied_for: roleAppliedFor })}, ${ip})`;
    });
    return c.json({ data: { id: applicationId, application_number: data.application_number }, requestId: c.get('requestId') }, 201);
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => c.env.PRIVATE_FILES.delete(key)));
    throw error;
  } finally { await closeDatabase(sql); }
});

export default router;
