type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className, decorative = false }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'São Irineu'}
      focusable="false"
    >
      <rect width="64" height="64" rx="18" fill="#f7f4ea" />
      <path d="M0 21.33h64v21.34H0z" fill="#3f84c2" />
      <path d="M0 42.67h64v21.33H0z" fill="#0f6f57" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#d7ceb8" strokeWidth="1.5" />
      <circle cx="31" cy="32" r="9.5" fill="#e8c24c" />
      <circle cx="35.8" cy="30.5" r="8.8" fill="#3f84c2" />
      <path d="M47.5 46.8 51.2 53H43.8Z" fill="none" stroke="#e8c24c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M47.5 54.2 43.8 48H51.2Z" fill="none" stroke="#e8c24c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}
