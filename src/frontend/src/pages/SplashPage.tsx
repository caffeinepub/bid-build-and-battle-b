import { useNavigate } from "@tanstack/react-router";

export default function SplashPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Decorative background orbs */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        {/* Gold orb top-right */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "oklch(0.82 0.18 85)" }}
        />
        {/* Cyan orb bottom-left */}
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "oklch(0.78 0.18 195)" }}
        />
        {/* Cricket green orb center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: "oklch(0.58 0.18 145)" }}
        />
        {/* Pink accent orb */}
        <div
          className="absolute top-1/4 right-1/3 w-48 h-48 rounded-full opacity-10 blur-2xl"
          style={{ background: "oklch(0.65 0.22 340)" }}
        />
      </div>

      {/* Cricket field lines — subtle decorative pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, oklch(0.58 0.18 145) 0px, oklch(0.58 0.18 145) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, oklch(0.58 0.18 145) 0px, oklch(0.58 0.18 145) 1px, transparent 1px, transparent 60px)",
        }}
      />

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
        {/* Logo — animated in on mount, then floats gently */}
        <div
          className="animate-splash-in mb-8"
          style={{ animationDelay: "0s" }}
        >
          <div className="animate-float">
            <img
              src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
              alt="IPL Auction — Bid Build Battle"
              className="w-72 sm:w-80 max-w-[340px] h-auto object-contain drop-shadow-2xl mx-auto"
              style={{
                filter: "drop-shadow(0 0 24px oklch(0.82 0.18 85 / 0.35))",
              }}
            />
          </div>
        </div>

        {/* Tagline */}
        <div
          className="animate-splash-in mb-2"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-xl sm:text-2xl font-bold tracking-wide text-gradient-gold uppercase">
            🏏 Predict, Pick, Dominate
          </p>
        </div>

        {/* Sub-tagline */}
        <div
          className="animate-splash-in mb-8"
          style={{ animationDelay: "0.25s" }}
        >
          <p className="text-sm text-muted-foreground tracking-widest uppercase font-medium">
            School of Management, Thanjavur
          </p>
        </div>

        {/* Divider with cricket emojis */}
        <div
          className="animate-splash-in flex items-center gap-3 mb-8 w-full"
          style={{ animationDelay: "0.3s" }}
        >
          <div
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, oklch(0.82 0.18 85 / 0.4))",
            }}
          />
          <span className="text-lg">🏟️</span>
          <span className="text-lg">🎯</span>
          <span className="text-lg">🏏</span>
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
          className="animate-splash-in w-full mb-4"
          style={{ animationDelay: "0.4s" }}
        >
          <button
            type="button"
            data-ocid="splash.primary_button"
            onClick={() => void navigate({ to: "/watch" })}
            className="w-full font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold-glow active:scale-[0.98] relative overflow-hidden group"
            style={{
              minHeight: "56px",
              background:
                "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.78 0.18 195))",
              color: "oklch(0.08 0.02 255)",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              🏆 Enter Auction
            </span>
            {/* Shimmer overlay */}
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
          className="animate-splash-in flex flex-col sm:flex-row gap-3 w-full"
          style={{ animationDelay: "0.5s" }}
        >
          <button
            type="button"
            data-ocid="splash.admin_link"
            onClick={() => void navigate({ to: "/admin/login" })}
            className="flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: "oklch(0.82 0.18 85 / 0.35)",
              color: "oklch(0.82 0.18 85)",
              background: "oklch(0.82 0.18 85 / 0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.82 0.18 85 / 0.12)";
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
            onClick={() => void navigate({ to: "/team/login" })}
            className="flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: "oklch(0.78 0.18 195 / 0.35)",
              color: "oklch(0.78 0.18 195)",
              background: "oklch(0.78 0.18 195 / 0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.78 0.18 195 / 0.12)";
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
          className="animate-splash-in mt-10 text-xs text-muted-foreground"
          style={{ animationDelay: "0.6s" }}
        >
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </main>
    </div>
  );
}
