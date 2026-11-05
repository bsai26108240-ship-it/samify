import React from 'react';

export const SamifyLogo = ({ className = "w-8 h-8" }) => (
  <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#121212] to-black border border-emerald-500/30 p-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="samify-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="#050505" />
      <path
        d="M 30 68 C 25 50, 45 40, 50 35 C 55 30, 75 30, 70 48 C 65 66, 45 60, 40 68 C 35 76, 65 75, 70 65"
        stroke="url(#samify-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="6" fill="#10b981" />
    </svg>
  </div>
);

