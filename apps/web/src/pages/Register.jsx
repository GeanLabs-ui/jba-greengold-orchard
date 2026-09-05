import React, { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { customerDestination } from '@/lib/login-audience';
import { useGoogleClientId } from '@/lib/use-google-client-id';
import { UserPlus, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import LocalCustomerRegistration from '@/components/LocalCustomerRegistration';

export default function Register() {
  const [searchParams] = useSearchParams();
  const fromUrl = customerDestination(searchParams.get('from_url'));
  const { clientId, localLoginEnabled, loading: loadingConfig } = useGoogleClientId();
  const googleAvailable = Boolean(clientId);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleGoogleCredential = useCallback(async (credential) => {
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaGoogle(credential, 'customer');
      window.location.assign(fromUrl);
    } catch (err) {
      setError(err.message || 'Google sign-up failed. Please try again.');
      setLoading(false);
      submitting.current = false;
    }
  }, [fromUrl]);

  const handleGoogleError = useCallback(() => {
    setError('Google sign-up could not load. Please refresh the page and try again.');
  }, []);

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your client account"
      subtitle={localLoginEnabled ? 'Create a client account for local testing.' : 'Sign up with your Google account to access the client portal.'}
      footer={<>Already have an account?{' '}<Link to={`/login?from_url=${encodeURIComponent(fromUrl)}`} className="text-primary font-medium hover:underline">Log in</Link></>}
    >
      {error && <div role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {loadingConfig ? <p role="status">Loading sign-up...</p> : localLoginEnabled ? <LocalCustomerRegistration destination={fromUrl} /> : googleAvailable ? (
        <div aria-busy={loading}>
          {loading ? (
            <p role="status" className="flex min-h-12 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Creating your account...
            </p>
          ) : <GoogleSignInButton onCredential={handleGoogleCredential} onError={handleGoogleError} />}
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Google sign-up is currently unavailable. Please try again later or <Link to="/contact" className="font-medium text-primary underline">contact us</Link> for help.
        </p>
      )}
      {!localLoginEnabled && <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">Use one Google account to manage your orders, payments, and documents. No separate password is needed.</p>}
    </AuthLayout>
  );
}
