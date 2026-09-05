import type { Identity } from './account-policy.js';

export interface IdentitySession {
  id: string; url?: string; status: string; livemode: boolean;
  metadata?: { verification_id?: string; user_id?: string };
  options?: { document?: { require_matching_selfie?: boolean } };
  verified_outputs?: { first_name?: string; last_name?: string; dob?: { year: number; month: number; day: number } };
}
export const stripeIdentityEnabled = (env: Env) => env.IDENTITY_ENABLED === 'true' && Boolean(env.STRIPE_IDENTITY_SECRET_KEY && env.IDENTITY_RETURN_ORIGIN);
export async function stripeIdentityRequest(env: Env, sessionId?: string, input?: { id: string; userId: string; identity: Identity }) : Promise<IdentitySession> {
  if (!stripeIdentityEnabled(env)) throw new Error('International verification is not available yet.');
  const body = input ? new URLSearchParams({
    type: 'document', 'options[document][require_matching_selfie]': 'true',
    'options[document][allowed_types][]': input.identity.documentType === 'national_id' ? 'id_card' : input.identity.documentType,
    'metadata[verification_id]': input.id, 'metadata[user_id]': input.userId,
    return_url: `${new URL(env.IDENTITY_RETURN_ORIGIN!).origin}/portal/account?verification=return`,
  }) : undefined;
  const response = await fetch(`https://api.stripe.com/v1/identity/verification_sessions${sessionId ? `/${encodeURIComponent(sessionId)}?expand[]=verified_outputs` : ''}`, {
    method: input ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env.STRIPE_IDENTITY_SECRET_KEY}`, 'Stripe-Version': '2024-06-20', ...(input ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': input.id } : {}) },
    body, signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('The verification provider is unavailable. Please try again later.');
  return response.json() as Promise<IdentitySession>;
}
export function verifiedSessionMatches(session: IdentitySession, id: string, userId: string, identity: Identity) {
  const normalize = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  const dob = session.verified_outputs?.dob;
  const birthDate = dob ? `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}` : '';
  const fullName = `${session.verified_outputs?.first_name || ''} ${session.verified_outputs?.last_name || ''}`;
  return session.status === 'verified' && session.livemode === true && session.metadata?.verification_id === id && session.metadata?.user_id === userId && session.options?.document?.require_matching_selfie === true && normalize(fullName) === normalize(identity.legalName) && birthDate === identity.dateOfBirth;
}
