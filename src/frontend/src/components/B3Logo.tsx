interface B3LogoProps {
  /** Height in pixels — width scales proportionally */
  size?: number;
  className?: string;
  /** If true, adds the continuous gold glow animation */
  glowing?: boolean;
}

/**
 * Reusable B³ logo component.
 * Use this in headers, splash screen, and anywhere the brand mark is needed.
 */
export default function B3Logo({
  size = 40,
  className = "",
  glowing = false,
}: B3LogoProps) {
  return (
    <img
      src="/assets/uploads/Cricket_auction_logo_for_Thanjavur_event-removebg-preview-1.png"
      alt="IPL Auction — Bid Build Battle"
      width={size}
      height={size}
      className={`object-contain ${glowing ? "animate-logo-glow" : ""} ${className}`}
      style={{ aspectRatio: "1 / 1" }}
    />
  );
}
