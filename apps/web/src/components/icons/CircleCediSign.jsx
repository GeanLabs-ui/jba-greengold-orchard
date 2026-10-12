import React from 'react';

export default function CircleCediSign({ className, ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16.25 8.25A5.4 5.4 0 0 0 12.75 7C10.13 7 8 9.24 8 12s2.13 5 4.75 5a5.4 5.4 0 0 0 3.5-1.25" />
      <path d="M12.75 5.5v13" />
    </svg>
  );
}
