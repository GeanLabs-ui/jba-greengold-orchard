import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, Loader2, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error | missing

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }
    base44.auth.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return (
      <AuthLayout icon={Loader2} title="Verifying your email" subtitle="Please wait…">
        <div className="flex justify-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (status === "success") {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Email verified"
        subtitle="Your account is now fully active"
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Continue to log in
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Your email address has been verified. You can now log in to your account.
        </p>
      </AuthLayout>
    );
  }

  if (status === "missing") {
    return (
      <AuthLayout
        icon={Mail}
        title="Check your inbox"
        subtitle="A verification link was sent to your email"
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Back to log in
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Please click the link in the verification email we sent you. If you
          don't see it, check your spam folder.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={AlertTriangle}
      title="Verification failed"
      subtitle="This link may have expired or already been used"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          Back to log in
        </Link>
      }
    >
      <p className="text-sm text-foreground text-center">
        Verification links expire after 24 hours and can only be used once.
        Please register again or contact support if the problem persists.
      </p>
    </AuthLayout>
  );
}
