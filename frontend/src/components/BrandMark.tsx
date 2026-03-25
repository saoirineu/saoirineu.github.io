import { useId } from 'react';

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className, decorative = false }: BrandMarkProps) {
  const backgroundId = useId();
  const glowId = useId();

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'São Irineu'}
      focusable="false"
    >
      <defs>
        <linearGradient id={backgroundId} x1="7" x2="53" y1="58" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#08111f" />
          <stop offset="55%" stopColor="#153c89" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(46 16) rotate(90) scale(14)">
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${backgroundId})`} />
      <circle cx="46" cy="16" r="14" fill={`url(#${glowId})`} opacity="0.72" />
      <path
        d="M17 50V33.5C17 23.835 24.835 16 34.5 16C44.165 16 52 23.835 52 33.5V50"
        fill="none"
        stroke="#f8f4ea"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.5"
      />
      <path
        d="M27 42C30.8 36.9 35.1 32.9 40.5 29.8C43.5 28.1 46.3 26.8 49.4 25.6"
        fill="none"
        stroke="#93c5fd"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.6"
      />
      <circle cx="27" cy="42" r="3.3" fill="#34d399" />
      <circle cx="40.5" cy="29.8" r="2.4" fill="#dbeafe" />
      <circle cx="49.4" cy="25.6" r="3.8" fill="#fbbf24" />
    </svg>
  );
}
