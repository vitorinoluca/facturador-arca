export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="16" cy="16" r="13.2" />
      <path d="M10.5 16.2l3.6 3.6 7.4-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
