import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { base44 } from '@/api/base44Client';

export default function AcceptStaffInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleCredential = useCallback(async (credential) => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      await base44.staff.acceptInvitation({ token, credential });
      setComplete(true);
      window.setTimeout(() => window.location.assign('/admin'), 900);
    } catch (err) {
      setError(err.message || 'This invitation could not be completed.');
      setLoading(false);
    }
  }, [token]);

  if (!token) {
    return (
      <AuthLayout icon={AlertTriangle} title="Invitation link unavailable" subtitle="Ask an administrator to send a new staff invitation" footer={<Link to="/login" className="text-primary font-medium hover:underline">Back to log in</Link>}>
        <p className="text-center text-sm text-muted-foreground">The link is missing its security token.</p>
      </AuthLayout>
    );
  }

  if (complete) {
    return (
      <AuthLayout icon={CheckCircle} title="Staff account ready" subtitle="Redirecting you to the workspace">
        <p className="text-center text-sm text-muted-foreground">Your Google account is now linked to your staff profile.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title="Set up your staff account" subtitle="Continue with the Google address that received this invitation" footer={<Link to="/login" className="text-primary font-medium hover:underline">Back to log in</Link>}>
      {error && <div role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-5"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : (
        <GoogleSignInButton onCredential={handleCredential} onError={(err) => setError(err.message || 'Google sign-in is unavailable')} />
      )}
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">For your security, the invitation works only with the exact Google email address it was sent to and expires after 24 hours.</p>
    </AuthLayout>
  );
}
