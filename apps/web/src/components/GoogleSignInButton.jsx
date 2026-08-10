import React, { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google sign-in could not be loaded"));
    document.head.appendChild(script);
  });
}

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
