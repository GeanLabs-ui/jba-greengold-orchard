import { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import StaffAuthLayout from '@/components/StaffAuthLayout';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { base44 } from '@/api/base44Client';

export default function AcceptStaffInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const submitting = useRef(false);

  const handleCredential = useCallback(async (credential) => {
    if (!token || submitting.current) return;
    submitting.current = true;
    setError('');
    setLoading(true);
    try {
      await base44.staff.acceptInvitation({ token, credential });
      setComplete(true);
      window.setTimeout(() => window.location.assign('/admin'), 900);
    } catch (err) {
      setError(err.message || 'This invitation could not be completed.');
      setLoading(false);
      submitting.current = false;
    }
  }, [token]);

  const handleGoogleError = useCallback((err) => {
    setError(err.message || 'Google sign-in is unavailable');
  }, []);

  if (complete) {
    return (
      <StaffAuthLayout title="Your account is ready" subtitle="Redirecting you to the workspace">
        <p role="status" className="text-center text-sm text-muted-foreground">Your Google account is linked to your workspace profile.</p>
      </StaffAuthLayout>
    );
  }

  return (
    <StaffAuthLayout
      title="Staff and admin signup"
      subtitle={token ? 'Continue with the Google account that received your invitation.' : 'Open the invitation sent to your work email to create your account.'}
      footer={
        <Link to="/staff-login" className="inline-flex items-center gap-2 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to staff login
        </Link>
      }
    >
      {error && <div role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!token ? (
        <p className="text-center text-sm text-muted-foreground">Need an invitation? Ask your workspace administrator to send one.</p>
      ) : loading ? (
        <p role="status" className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Setting up your account…
        </p>
      ) : (
        <>
          <div className="text-center"><GoogleSignInButton onCredential={handleCredential} onError={handleGoogleError} /></div>
          <p className="mt-4 text-center text-sm text-muted-foreground">Your invitation expires after 24 hours.</p>
        </>
      )}
    </StaffAuthLayout>
  );
}
