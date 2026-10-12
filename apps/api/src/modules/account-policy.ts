import { z } from 'zod';

export const identitySchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  country: z.string().regex(/^[A-Z]{2}$/).refine((country) => {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(country) !== country; } catch { return false; }
  }, 'Choose a recognized country'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date >= '1900-01-01' && parsed < new Date();
  }, 'Enter a valid date of birth'),
  documentType: z.enum(['national_id', 'passport', 'driving_license']),
  documentNumber: z.string().trim().min(4).max(64),
}).strict().superRefine((value, ctx) => {
  if (value.country === 'GH' && value.documentType === 'national_id' && !/^GHA-\d{9}-\d$/i.test(value.documentNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentNumber'], message: 'Use the Ghana Card number format GHA-123456789-0' });
  }
});
export type Identity = z.infer<typeof identitySchema>;
export const identityLocked = (status?: string) => status === 'pending' || status === 'verified';
export function validAccountFile(type: string, bytes: Uint8Array, photo: boolean) {
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return !photo && type === 'application/pdf' && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}
