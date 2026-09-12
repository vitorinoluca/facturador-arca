export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect x="6" y="6" width="88" height="88" rx="18" fill="#173C33" />
      <path
        d="M34 26 H66 V70 L60 66 L54 70 L48 66 L42 70 L36 66 L34 70 Z"
        fill="none"
        stroke="#F4F1EA"
        strokeWidth="3.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1="40" y1="37" x2="60" y2="37" stroke="#F4F1EA" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="44.5" x2="60" y2="44.5" stroke="#F4F1EA" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="52" x2="52" y2="52" stroke="#F4F1EA" strokeWidth="3" strokeLinecap="round" />
      <circle cx="69" cy="55" r="13.2" fill="#F4F1EA" />
      <path
        d="M63.5 55 L67.8 59.5 L75.5 50"
        fill="none"
        stroke="#173C33"
        strokeWidth="3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
