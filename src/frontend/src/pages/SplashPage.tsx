import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type Phase = "entering" | "ball-rolling" | "logo-hit" | "settled" | "exiting";

export default function SplashPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("entering");
  const [showContent, setShowContent] = useState(false);
  const [logoHit, setLogoHit] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  // Orchestrate the animation sequence
  useEffect(() => {
    // 0.3s  → stadium fades in, then ball starts rolling
    const t1 = setTimeout(() => setPhase("ball-rolling"), 300);
    // 1.8s  → ball reaches logo → trigger hit bounce + glow
    const t2 = setTimeout(() => {
      setPhase("logo-hit");
      setLogoHit(true);
      setTimeout(() => setLogoHit(false), 500);
    }, 1800);
    // 2.2s  → content slides in
    const t3 = setTimeout(() => {
      setPhase("settled");
      setShowContent(true);
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleEnter = (to: "/" | "/admin/login" | "/team/login" | "/watch") => {
    setPhase("exiting");
    setTimeout(() => void navigate({ to }), 550);
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-50
        ${phase === "exiting" ? "animate-splash-exit" : "animate-stadium-in"}`}
    >
      {/* ── Stadium background ── */}
      <div className="absolute inset-0">
        <img
          src="/assets/generated/stadium-bg.dim_1920x1080.jpg"
          alt=""
          aria-hidden
          className="w-full h-full object-cover"
        />
        {/* Dark overlay so text/logo pops */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.06 0.03 255 / 0.55) 0%, oklch(0.06 0.03 255 / 0.72) 50%, oklch(0.04 0.02 255 / 0.88) 100%)",
          }}
        />
      </div>

      {/* ── Stadium light beams (decorative) ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Top-left beam */}
        <div
          className="absolute animate-light-beam"
          style={{
            top: 0,
            left: "10%",
            width: "2px",
            height: "45%",
            background:
              "linear-gradient(180deg, oklch(0.95 0.05 85 / 0.6), transparent)",
            transform: "rotate(15deg)",
            transformOrigin: "top center",
          }}
        />
        {/* Top-right beam */}
        <div
          className="absolute animate-light-beam"
          style={{
            top: 0,
            right: "12%",
            width: "2px",
            height: "40%",
            background:
              "linear-gradient(180deg, oklch(0.95 0.05 85 / 0.5), transparent)",
            transform: "rotate(-18deg)",
            transformOrigin: "top center",
            animationDelay: "0.8s",
          }}
        />
        {/* Floodlight glow top-left */}
        <div
          className="absolute -top-16 -left-8 w-64 h-64 rounded-full blur-3xl animate-light-beam"
          style={{
            background: "oklch(0.95 0.08 85 / 0.12)",
            animationDelay: "0.3s",
          }}
        />
        {/* Floodlight glow top-right */}
        <div
          className="absolute -top-16 -right-8 w-64 h-64 rounded-full blur-3xl animate-light-beam"
          style={{
            background: "oklch(0.95 0.08 85 / 0.10)",
            animationDelay: "1.1s",
          }}
        />
      </div>

      {/* ── Cricket ball rolling ── */}
      {phase === "ball-rolling" && (
        <div
          className="absolute pointer-events-none z-20 animate-ball-roll"
          aria-hidden
          style={{
            top: "calc(50% - 160px)",
            left: "50%",
            marginLeft: "-16px",
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #e8341e, #8b1a0a)",
              boxShadow:
                "0 2px 12px oklch(0.6 0.22 25 / 0.6), inset 0 1px 2px rgba(255,255,255,0.2)",
            }}
          >
            {/* Seam lines */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 4 Q20 16 16 28' stroke='%23fff' stroke-width='1.2' fill='none' opacity='0.4'/%3E%3Cpath d='M16 4 Q12 16 16 28' stroke='%23fff' stroke-width='1.2' fill='none' opacity='0.4'/%3E%3C/svg%3E\") center/cover",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Main logo ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl w-full">
        {/* Logo container */}
        <div
          ref={logoRef}
          className={`mb-6 ${logoHit ? "animate-logo-hit" : ""} ${phase === "settled" ? "animate-logo-glow" : ""}`}
        >
          <img
            src="/assets/uploads/Cricket_auction_logo_for_Thanjavur_event-removebg-preview-1.png"
            alt="IPL Auction — Bid Build Battle"
            className="w-64 sm:w-80 md:w-96 max-w-[360px] h-auto object-contain mx-auto drop-shadow-2xl"
            style={{
              filter:
                phase === "logo-hit"
                  ? "drop-shadow(0 0 60px oklch(0.82 0.18 85 / 1)) drop-shadow(0 0 120px oklch(0.82 0.18 85 / 0.6))"
                  : "drop-shadow(0 0 24px oklch(0.82 0.18 85 / 0.4))",
              transition: "filter 0.3s ease",
            }}
          />
        </div>

        {/* Text content — appears after ball hits */}
        {showContent && (
          <>
            {/* Title */}
            <div
              className="animate-splash-in mb-1"
              style={{ animationDelay: "0s" }}
            >
              <h1
                className="text-2xl sm:text-3xl font-black tracking-wider uppercase"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.95 0.05 85), oklch(0.82 0.18 85))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "none",
                }}
              >
                Bid Build and Battle
              </h1>
            </div>

            {/* Subtitle */}
            <div
              className="animate-splash-in mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              <p
                className="text-sm sm:text-base tracking-widest uppercase font-medium"
                style={{ color: "oklch(0.78 0.18 195)" }}
              >
                Live Cricket Auction Platform
              </p>
              <p
                className="text-xs mt-1 tracking-wider uppercase"
                style={{ color: "oklch(0.6 0.04 255)" }}
              >
                School of Management, Thanjavur
              </p>
            </div>

            {/* Loading text + dots */}
            <div
              className="animate-splash-in mb-8 flex items-center gap-2"
              style={{ animationDelay: "0.15s" }}
            >
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: "oklch(0.55 0.04 255)" }}
              >
                Loading Auction Arena
              </span>
              <span className="flex items-center gap-1">
                <span className="dot-1 inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                <span className="dot-2 inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                <span className="dot-3 inline-block w-1.5 h-1.5 rounded-full bg-gold" />
              </span>
            </div>

            {/* Divider */}
            <div
              className="animate-splash-in flex items-center gap-3 mb-6 w-full max-w-sm"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(to right, transparent, oklch(0.82 0.18 85 / 0.4))",
                }}
              />
              <span className="text-base">🏏</span>
              <span className="text-base">🏟️</span>
              <span className="text-base">🏆</span>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(to left, transparent, oklch(0.82 0.18 85 / 0.4))",
                }}
              />
            </div>

            {/* Primary CTA */}
            <div
              className="animate-splash-in w-full max-w-sm mb-3"
              style={{ animationDelay: "0.25s" }}
            >
              <button
                type="button"
                data-ocid="splash.primary_button"
                onClick={() => handleEnter("/watch")}
                className="w-full font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                style={{
                  minHeight: "56px",
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.72 0.18 75))",
                  color: "oklch(0.08 0.02 255)",
                  boxShadow:
                    "0 4px 24px oklch(0.82 0.18 85 / 0.35), 0 0 0 1px oklch(0.82 0.18 85 / 0.2)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  🏆 Enter Auction
                </span>
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.92 0.12 85 / 0.3), transparent 60%)",
                  }}
                />
              </button>
            </div>

            {/* Secondary links */}
            <div
              className="animate-splash-in flex flex-col sm:flex-row gap-3 w-full max-w-sm"
              style={{ animationDelay: "0.35s" }}
            >
              <button
                type="button"
                data-ocid="splash.admin_link"
                onClick={() => handleEnter("/admin/login")}
                className="flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: "oklch(0.82 0.18 85 / 0.35)",
                  color: "oklch(0.82 0.18 85)",
                  background: "oklch(0.82 0.18 85 / 0.06)",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.82 0.18 85 / 0.14)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.82 0.18 85 / 0.06)";
                }}
              >
                🛡️ Admin Login
              </button>
              <button
                type="button"
                data-ocid="splash.team_link"
                onClick={() => handleEnter("/team/login")}
                className="flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: "oklch(0.78 0.18 195 / 0.35)",
                  color: "oklch(0.78 0.18 195)",
                  background: "oklch(0.78 0.18 195 / 0.06)",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.78 0.18 195 / 0.14)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.78 0.18 195 / 0.06)";
                }}
              >
                👥 Team Login
              </button>
            </div>

            {/* Footer */}
            <div
              className="animate-splash-in mt-8 text-xs"
              style={{ animationDelay: "0.45s", color: "oklch(0.45 0.03 255)" }}
            >
              © {new Date().getFullYear()}.{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
              >
                Built with caffeine.ai
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
