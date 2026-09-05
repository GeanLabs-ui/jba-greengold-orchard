import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LocalCustomerRegistration({ destination }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const submit = async event => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await base44.auth.registerLocalCustomer(form);
      window.location.assign(destination);
    } catch (failure) {
      setError(failure.message || 'Could not create your local client account.');
      submitting.current = false;
      setLoading(false);
    }
  };
  return <form onSubmit={submit} className="space-y-4">
    <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Local test account. Email verification is simulated for development; this account cannot sign in to staging or production.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="space-y-2"><Label htmlFor="local-name">Full name</Label><Input id="local-name" name="fullName" autoComplete="name" value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} required minLength={2} maxLength={200} /></div>
    <div className="space-y-2"><Label htmlFor="local-email">Email</Label><Input id="local-email" name="email" type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required maxLength={254} /></div>
    <div className="space-y-2"><Label htmlFor="local-password">Password</Label><Input id="local-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required minLength={12} maxLength={128} aria-describedby="local-password-help" /><p id="local-password-help" className="text-xs text-muted-foreground">At least 12 characters. Use a password only for local testing.</p></div>
    <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create local client account'}</Button>
  </form>;
}
