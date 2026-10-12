import React from 'react';
import { Button } from '@/components/ui/button';
import { useGoogleClientId } from '@/lib/use-google-client-id';

export default function LocalTestLogin({ audience, onLogin, disabled }) {
  const { localLoginEnabled } = useGoogleClientId();
  if (!localLoginEnabled) return null;
  const staff = audience === 'staff';
  return <div className="mb-5 rounded-lg border border-border bg-muted/40 p-4">
    <p className="font-semibold">Local development</p>
    <p className="mt-1 text-sm text-muted-foreground">Use the seeded test {staff ? 'admin' : 'customer'} account. No Google account needed.</p>
    <Button type="button" className="mt-3 w-full" onClick={() => onLogin(staff ? 'admin' : 'customer')} disabled={disabled}>
      {staff ? 'Log in as local test admin' : 'Log in as local test customer'}
    </Button>
  </div>;
}
