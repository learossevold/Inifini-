// Inifini brand mark — navy speech-bubble "a", recreated as crisp SVG.
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Inifini" role="img">
      {/* Outer shape: rounded top-left, square bottom-right */}
      <path
        d="M50 6 A44 44 0 1 0 50 94 L94 94 L94 50 A44 44 0 0 0 50 6 Z"
        fill="#001627"
      />
      {/* Inner cut: smaller version of the same shape in white */}
      <path
        d="M50 32 A18 18 0 1 0 50 68 L68 68 L68 50 A18 18 0 0 0 50 32 Z"
        fill="#FBFAF7"
      />
    </svg>
  );
}
