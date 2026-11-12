import React, { useCallback, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { loginDestination } from "@/lib/login-audience";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import StaffAuthLayout from "@/components/StaffAuthLayout";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import LocalTestLogin from '@/components/LocalTestLogin';

export default function Login() {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { audience, target: fromUrl } = loginDestination(searchParams, location.pathname === '/staff-login');
  const isStaff = audience === 'staff';
  const Layout = isStaff ? StaffAuthLayout : AuthLayout;
  const SubmitButton = isStaff ? 'button' : Button;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password, audience);
      window.location.href = fromUrl;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaGoogle(credential, audience);
      window.location.assign(fromUrl);
    } catch (err) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  }, [fromUrl, audience]);

  const handleGoogleError = useCallback((err) => {
    setError(err.message || "Google sign-in is unavailable");
  }, []);

  const handleLocalLogin = async (account) => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginLocalTestAccount(account, audience);
      window.location.assign(fromUrl);
    } catch (err) {
      setError(err.message || 'Local test login failed.');
      setLoading(false);
    }
  };

  return (
    <Layout
      icon={LogIn}
      title={isStaff ? 'Welcome back' : 'Customer login'}
      subtitle={isStaff ? 'Log in to your staff or admin account' : 'Log in to your verified customer account'}
      footer={
        isStaff ? <>
          <p>New to the workspace?{' '}<Link to="/accept-staff-invite" className="hover:underline">Sign up</Link></p>
          <Link to="/login" className="inline-flex items-center gap-2 hover:underline">
            Customer login <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </> : <>
          Don't have an account?{" "}
          <Link
            to={`/register?from_url=${encodeURIComponent(fromUrl)}`}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
          <p className="mt-3"><Link to="/staff-login" className="text-primary hover:underline">Staff and admin login</Link></p>
        </>
      }
    >
      {!isStaff && <LocalTestLogin audience={audience} onLogin={handleLocalLogin} disabled={loading} />}
      {import.meta.env.DEV && isDemoMode && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Client preview administrator</p>
          <p className="mt-1 break-all">Email: admin@jbagreengoldorchard.com</p>
          <p className="break-all">Password: OrchardPreview#2026</p>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {!isDemoMode && (
        <div className={isStaff ? 'staff-auth__google' : undefined}>
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={handleGoogleError} />
          <div className={isStaff ? 'staff-auth__divider flex items-center gap-4' : 'my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground'}>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={isStaff ? 'staff-auth__form space-y-5' : 'space-y-4'}>
        <div className="space-y-2">
          <Label className="text-label" htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus={!isStaff}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-label" htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={isStaff && showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={isStaff ? 'Password' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={isStaff ? 'pl-10 pr-12 h-12' : 'pl-10 h-12'}
              required
            />
            {isStaff && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="password"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
        <SubmitButton type="submit" className={isStaff ? 'staff-auth__submit' : 'w-full h-12 font-medium'} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </SubmitButton>
      </form>
      {isStaff && (
        <div className="mt-5 empty:hidden [&>div]:mb-0">
          <LocalTestLogin audience={audience} onLogin={handleLocalLogin} disabled={loading} />
        </div>
      )}
    </Layout>
  );
}
