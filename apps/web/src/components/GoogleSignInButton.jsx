import React, { useEffect, useRef, useState } from "react";
import { loadGoogleIdentityServices } from '@/lib/google-identity';
import { useGoogleClientId } from '@/lib/use-google-client-id';

export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);
  const { clientId, loading } = useGoogleClientId();
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let active = true;

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !google?.accounts?.id || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
            else onError?.(new Error("Google sign-in did not return a credential"));
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: Math.min(400, buttonRef.current.clientWidth || 400),
        });
      })
      .catch((error) => {
        if (!active) return;
        setAvailable(false);
        onError?.(error);
      });

    return () => {
      active = false;
    };
  }, [clientId, onCredential, onError]);

  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading Google sign-in...</p>;
  if (!clientId || !available) return <p role="status" className="text-sm text-muted-foreground">Google sign-in is unavailable. Please contact the administrator.</p>;
  return <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />;
}
