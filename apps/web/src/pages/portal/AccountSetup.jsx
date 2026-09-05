import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUp, Camera, Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AccountAvatar } from '@/components/portal/AccountMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import BrandLogo from '@/components/shared/BrandLogo';
import './account-setup.css';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = Array.from({ length: 26 * 26 }, (_, n) => String.fromCharCode(65 + Math.floor(n / 26), 65 + n % 26)).filter((code) => countryNames.of(code) !== code && !['EU', 'UN', 'QO', 'XA', 'XB', 'ZZ'].includes(code)).map((code) => [code, countryNames.of(code)]).sort((a, b) => a[1].localeCompare(b[1]));
const emptyIdentity = { legalName: '', country: 'GH', dateOfBirth: '', documentType: 'national_id', documentNumber: '' };
const selectClass = 'account-setup-input';
const statusLabels = { pending: 'Verification pending', verified: 'Identity verified', rejected: 'Action required' };

export default function AccountSetup() {
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const photoRef = useRef(null);
  const { user, checkUserAuth } = useAuth();
  const [account, setAccount] = useState(null);
  const [identity, setIdentity] = useState(emptyIdentity);
  const [files, setFiles] = useState({});
  const [consent, setConsent] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const result = await base44.account.get();
    setAccount(result);
    setIdentity(result.verification?.identity || { ...emptyIdentity, legalName: user?.full_name || '' });
  }, [user?.full_name]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const run = async (action, work) => {
    setBusy(action); setError(''); setMessage('');
    try { await work(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const status = account?.verification?.status;
  const locked = status === 'verified' || status === 'pending';
  const hosted = identity.country !== 'GH' && account?.internationalEnabled;
  useEffect(() => {
    if (status !== 'pending') return undefined;
    const refreshPendingReview = () => load().catch((e) => setError(e.message));
    const timer = window.setInterval(refreshPendingReview, 30000);
    window.addEventListener('focus', refreshPendingReview);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshPendingReview); };
  }, [load, status]);
  const setField = (key, value) => { setIdentity((current) => ({ ...current, [key]: value })); if (key === 'country' || key === 'documentType') { setFiles({}); setConsent(false); } };
  const uploadPhoto = (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    run('photo', async () => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP photo up to 2 MB.');
      await base44.account.upload(file, 'photo', user?.id);
      await checkUserAuth();
      setMessage('Profile photo updated.');
    });
  };
  const refresh = () => run('refresh', async () => {
    const result = await base44.account.refresh(user?.id);
    await load();
    if (result.status === 'verified') await checkUserAuth();
    if (result.url) window.location.assign(result.url);
    else setMessage(result.status === 'verified' ? 'Your identity has been verified.' : 'Verification status updated.');
  });
  const submit = (event) => {
    event.preventDefault();
    run('submit', async () => {
      const documentIds = [];
      if (!hosted) {
        const needed = identity.documentType === 'passport' ? ['front'] : ['front', 'back'];
        for (const side of needed) {
          const file = files[side];
          if (!file || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose each required document image or PDF, up to 5 MB per file.');
        }
        for (const side of needed) documentIds.push((await base44.account.upload(files[side], 'document', user?.id)).id);
      }
      const result = await base44.account.submit({ identity, documentIds, consent }, user?.id);
      setFiles({}); setConsent(false);
      await load();
      setMessage('Your documents have been submitted. Your identity is pending verification.');
      if (result.hosted) {
        const session = await base44.account.refresh(user?.id);
        if (session.url) window.location.assign(session.url);
      }
    });
  };
  const close = () => { if (!busy) navigate('/portal'); };
  return <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="account-setup-overlay" />
      <Dialog.Content className="account-setup-dialog" onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => event.preventDefault()}>
        <header className="account-setup-header">
          <div className="account-setup-brand-row"><BrandLogo className="account-setup-logo-frame" imageClassName="account-setup-logo" /><span className="account-setup-status" data-status={status || 'unverified'}>{statusLabels[status] || 'Not verified'}</span></div>
          <Dialog.Title ref={titleRef} tabIndex={-1} className="account-setup-title">Account Setup</Dialog.Title>
          <Dialog.Description className="account-setup-description">Complete your profile and verify your identity.</Dialog.Description>
        </header>
        {error && <div role="alert" className="account-setup-notice account-setup-error">{error}{!account && <Button variant="outline" className="ml-3" onClick={() => run('load', load)}>Try again</Button>}</div>}
        {message && <p role="status" className="account-setup-notice">{message}</p>}
        <section className="account-setup-photo" aria-labelledby="photo-heading">
          <div className="account-setup-avatar-wrap">
            <AccountAvatar user={user} className="account-setup-avatar" />
            <button type="button" className="account-setup-camera" aria-label="Change profile photo" disabled={Boolean(busy)} onClick={() => photoRef.current?.click()}><Camera aria-hidden="true" /></button>
          </div>
          <div className="account-setup-photo-copy"><h2 id="photo-heading">Profile Photo</h2><p>{user?.email}</p><p>JPG, PNG or WebP · Up to 2 MB</p></div>
          <button type="button" className="account-setup-outline account-setup-photo-button" disabled={Boolean(busy)} onClick={() => photoRef.current?.click()}><Camera aria-hidden="true" />{busy === 'photo' ? 'Uploading…' : 'Change Photo'}</button>
          <input ref={photoRef} aria-label="Upload profile photo" type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={uploadPhoto} />
        </section>
        {!account ? <><p role="status" className="account-setup-loading">{error ? 'Account details could not be loaded.' : 'Loading account details…'}</p><button type="button" className="account-setup-outline" disabled={Boolean(busy)} onClick={close}>Cancel</button></> : <>
          <section className="account-setup-identity" aria-labelledby="identity-heading">
            <h2 id="identity-heading"><ShieldCheck aria-hidden="true" />Identity Verification</h2>
            {locked && <p className="account-setup-notice flex gap-2"><LockKeyhole className="h-4 w-4 shrink-0" />{status === 'verified' ? 'Your identity details are verified and locked. Request an administrator review to make changes.' : 'Your submission is pending verification. Details are locked while it is being checked.'}</p>}
            {status === 'rejected' && <div className="account-setup-notice account-setup-rejected" role="alert"><AlertTriangle aria-hidden="true" /><div><strong>Verification update required</strong><p>{account.verification?.review_note || 'Please correct your identity details and upload clear replacement documents.'}</p><small>Your form is unlocked below. Update the requested information, attach new documents, and submit again.</small></div></div>}
            {status !== 'rejected' && account.verification?.review_note && <p className="account-setup-notice">Review update: {account.verification.review_note}</p>}
            <form onSubmit={submit}>
              <fieldset disabled={locked || Boolean(busy)} className="account-setup-fields">
                <div className="account-setup-field"><Label htmlFor="legal-name">Full Legal Name</Label><Input id="legal-name" autoComplete="name" required minLength={2} maxLength={200} value={identity.legalName} onChange={(e) => setField('legalName', e.target.value)} /></div>
                <div className="account-setup-field"><Label htmlFor="identity-dob">Date of Birth</Label><Input id="identity-dob" type="date" required min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={identity.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} /></div>
                <div className="account-setup-field"><Label htmlFor="identity-country">Issuing Country</Label><select id="identity-country" className={selectClass} value={identity.country} onChange={(e) => setField('country', e.target.value)}>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
                <div className="account-setup-field"><Label htmlFor="document-type">Document Type</Label><select id="document-type" className={selectClass} value={identity.documentType} onChange={(e) => setField('documentType', e.target.value)}><option value="national_id">{identity.country === 'GH' ? 'Ghana Card (National ID)' : 'National ID card'}</option><option value="passport">Passport</option><option value="driving_license">Driving licence</option></select></div>
                <div className="account-setup-field account-setup-number"><Label htmlFor="document-number">Document Number</Label><Input id="document-number" required minLength={4} maxLength={64} autoComplete="off" placeholder={identity.country === 'GH' && identity.documentType === 'national_id' ? 'GHA-123456789-0' : 'Number on your document'} value={identity.documentNumber} onChange={(e) => setField('documentNumber', e.target.value)} /></div>
                {!locked && <>
                  {hosted ? <p className="account-setup-hosted">Continue to Stripe Identity to securely upload your document and take a matching selfie. Accepted documents depend on the issuing country.</p> : <div className="account-setup-documents">
                    {(identity.documentType === 'passport' ? ['front'] : ['front', 'back']).map((side) => <div key={identity.country + '-' + identity.documentType + '-' + side} className="account-setup-field">
                      <Label htmlFor={'document-' + side}>{identity.documentType === 'passport' ? 'Passport Photo Page' : side === 'front' ? 'Document Front' : 'Document Back'}</Label>
                      <div className="account-setup-upload">
                        <input id={'document-' + side} type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles((current) => ({ ...current, [side]: e.target.files?.[0] }))} />
                        <span className="account-setup-upload-icon">{files[side] ? <Check aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}</span>
                        <span className="account-setup-upload-copy"><strong>{files[side]?.name || (side === 'front' ? 'Upload Front' : 'Upload Back')}</strong><small>{files[side] ? 'Click to change file' : 'JPG, PNG, WebP or PDF up to 5 MB'}</small></span>
                      </div>
                    </div>)}
                  </div>}
                  <label className="account-setup-consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I confirm that the information provided is true and correct. I consent to identity verification{hosted ? ' by Stripe Identity, including a selfie check' : ' and administrator review'}.</span></label>
                </>}
              </fieldset>
              <div className="account-setup-actions">
                <button type="button" className="account-setup-outline" disabled={Boolean(busy)} onClick={close}>Cancel</button>
                {!locked && <button className="account-setup-submit" disabled={Boolean(busy) || !consent} type="submit"><ShieldCheck aria-hidden="true" />{busy === 'submit' ? 'Submitting…' : hosted ? 'Continue to Verification' : 'Submit for Verification'}</button>}
                {status === 'pending' && <Button variant="outline" disabled={Boolean(busy)} onClick={refresh} type="button">{busy === 'refresh' ? 'Checking…' : account.verification.provider === 'stripe_identity' ? 'Continue / check verification' : 'Refresh status'}</Button>}
              </div>
            </form>
          </section>
      {locked && <section className="border-t pt-6" aria-labelledby="change-heading"><h2 id="change-heading" className="text-lg font-semibold">Request a change</h2><p className="mt-1 text-sm text-muted-foreground">Tell the administrator what needs correcting. Approved changes require fresh verification.</p>{account.changeRequest && <p className="mt-3 text-sm">Request status: <strong>{account.changeRequest.status}</strong>{account.changeRequest.review_note && ` — ${account.changeRequest.review_note}`}</p>}{account.changeRequest?.status !== 'pending' && <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run('request', async () => { await base44.account.requestChange(reason, user?.id); setReason(''); await load(); setMessage('Your request has been sent to the administrator.'); }); }}><Label htmlFor="change-reason">What would you like to change, and why?</Label><Textarea id="change-reason" required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /><Button type="submit" variant="outline" disabled={Boolean(busy)}>{busy === 'request' ? 'Sending…' : 'Send request to admin'}</Button></form>}</section>}
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
