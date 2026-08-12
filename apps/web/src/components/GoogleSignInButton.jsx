import React, { useEffect, useRef, useState } from "react";
import { loadGoogleIdentityServices } from '@/lib/google-identity';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);
  const [available, setAvailable] = useState(Boolean(GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return undefined;
    let active = true;

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !google?.accounts?.id || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
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
  }, [onCredential, onError]);

  if (!available) return null;
  return <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />;
}
