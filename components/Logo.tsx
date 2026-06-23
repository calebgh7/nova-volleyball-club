// Placeholder Nova star mark, rendered as inline SVG so the app needs no asset
// file to build. Swap for the official logo from assets/brand/ when available.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Nova Volleyball Club"
    >
      {/* four-point star ("nova") */}
      <path
        d="M50 2 C54 30 70 46 98 50 C70 54 54 70 50 98 C46 70 30 54 2 50 C30 46 46 30 50 2 Z"
        fill="#B9E7FE"
        stroke="#4D1F84"
        strokeWidth="2"
      />
    </svg>
  );
}
