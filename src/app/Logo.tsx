// TiftonWala brand mark: a basket whose handle doubles as the arc of a road,
// over a green→teal badge — the two things the app does (groceries, rides) in
// one shape. Kept as inline SVG so it inherits the page's dark/light rendering
// and costs no extra request. The same artwork lives in src/app/icon.svg.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="TiftonWala"
    >
      <defs>
        <linearGradient id="tw-badge" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#1f9d55" />
          <stop offset="100%" stopColor="#0d7a6f" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#tw-badge)" />
      {/* handle / road arc */}
      <path
        d="M17 23a7 7 0 0 1 14 0"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* basket */}
      <path
        d="M11.5 23h25l-3.1 11.6a3 3 0 0 1-2.9 2.2H17.5a3 3 0 0 1-2.9-2.2z"
        fill="#ffffff"
      />
      <path
        d="M20.4 27.5l.9 5.6M27.6 27.5l-.9 5.6"
        stroke="#1f9d55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* road dashes under the basket — motion, the drive itself */}
      <path
        d="M13 41h6M23 41h4M31 41h4"
        stroke="#ffffff"
        strokeOpacity="0.65"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  size = 40,
  showWordmark = true,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  /** Set the wordmark's font-size here — it inherits from this wrapper. */
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display font-extrabold tracking-tight">
          Tifton<span className="text-brand">Wala</span>
        </span>
      )}
    </span>
  );
}
