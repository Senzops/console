import React from 'react';

export function SenzorAIIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5v13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
      <circle cx="16" cy="9" r="1" fill="currentColor" />
      <circle cx="7" cy="14" r="1" fill="currentColor" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}
