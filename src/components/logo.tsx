// No directive: plain SVG, usable from server and client components alike.

/** Fornetto oven mark — accent arch, base line + door arch in ink. */
export function Logo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path
        d="M17 86 V50 A33 33 0 0 1 83 50 V86"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="8"
      />
      <path
        d="M6 86 H94"
        stroke="var(--color-text)"
        strokeWidth="8"
        strokeLinecap="square"
      />
      <path
        d="M36 86 A14 14 0 0 1 64 86"
        fill="none"
        stroke="var(--color-text)"
        strokeWidth="8"
      />
    </svg>
  );
}
