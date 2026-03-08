/**
 * AuctionDramaOverlay — full-screen overlay showing IPL-style drama at final seconds.
 * "Going Once!" → "Going Twice!" → "SOLD!" / "UNSOLD"
 * Positioned fixed/pointer-events-none so it never blocks interaction.
 */

import React, { useEffect, useRef, useState } from "react";

interface AuctionDramaOverlayProps {
  timerSeconds: number;
  isLive: boolean;
  hasPlayer: boolean;
  highestBidder: string | null;
}

export default function AuctionDramaOverlay({
  timerSeconds,
  isLive,
  hasPlayer,
  highestBidder,
}: AuctionDramaOverlayProps) {
  // Track whether the sold/unsold flash is still visible
  const [soldVisible, setSoldVisible] = useState(false);
  // Track what was resolved (sold vs unsold) to keep displaying during 2s window
  const [resolvedState, setResolvedState] = useState<"sold" | "unsold" | null>(
    null,
  );
  // Ref to debounce the timer=0 trigger (only fire once per player resolution)
  const resolvedPlayerRef = useRef<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When timer hits 0, trigger the sold/unsold flash once
  useEffect(() => {
    if (!isLive || !hasPlayer) return;

    if (timerSeconds === 0) {
      // Build a key from current state to avoid double-triggering
      const key = `${highestBidder ?? "none"}`;
      if (resolvedPlayerRef.current === key) return;
      resolvedPlayerRef.current = key;

      const state = highestBidder ? "sold" : "unsold";
      setResolvedState(state);
      setSoldVisible(true);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setSoldVisible(false);
      }, 2000);
    }
  }, [timerSeconds, isLive, hasPlayer, highestBidder]);

  // Reset when a new player appears (timer resets above 5)
  useEffect(() => {
    if (timerSeconds > 5 && isLive) {
      resolvedPlayerRef.current = null;
      setSoldVisible(false);
      setResolvedState(null);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [timerSeconds, isLive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Nothing to show
  if (!isLive || !hasPlayer) return null;

  // ── SOLD / UNSOLD flash (timer = 0) ──────────────────────────────────────────
  if (timerSeconds === 0 && soldVisible && resolvedState) {
    if (resolvedState === "sold") {
      return (
        <div
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          aria-live="assertive"
          aria-label="Sold!"
        >
          {/* Green radial burst */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.55 0.20 145 / 0.20) 0%, transparent 65%)",
              animation: "dramaBurst 0.5s ease-out forwards",
            }}
            aria-hidden
          />
          {/* Star particles */}
          {(["0", "1", "2", "3", "4", "5"] as const).map((idx) => {
            const i = Number(idx);
            return (
              <div
                key={idx}
                className="absolute text-3xl"
                style={{
                  top: `${20 + Math.sin((i * 60 * Math.PI) / 180) * 30}%`,
                  left: `${50 + Math.cos((i * 60 * Math.PI) / 180) * 35}%`,
                  animation: `starBurst 0.8s ease-out ${i * 0.08}s forwards`,
                  opacity: 0,
                }}
                aria-hidden
              >
                ⭐
              </div>
            );
          })}
          <div
            style={{
              animation:
                "dramaBounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              textShadow:
                "0 0 50px oklch(0.55 0.20 145 / 0.9), 0 0 100px oklch(0.55 0.20 145 / 0.5)",
            }}
            className="text-center select-none relative z-10"
          >
            <p
              className="text-8xl sm:text-9xl font-black tracking-tighter"
              style={{ color: "oklch(0.65 0.22 145)" }}
            >
              SOLD!
            </p>
            {highestBidder && (
              <p
                className="text-xl sm:text-2xl font-bold mt-2"
                style={{ color: "oklch(0.78 0.18 195)" }}
              >
                🏏 {highestBidder}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        aria-live="assertive"
        aria-label="Unsold"
      >
        <div
          style={{
            animation: "dramaFadeIn 0.4s ease-out forwards",
            textShadow: "0 0 20px oklch(0.45 0.05 255 / 0.5)",
          }}
          className="text-center select-none"
        >
          <p
            className="text-7xl sm:text-8xl font-black tracking-tight"
            style={{ color: "oklch(0.50 0.04 255)" }}
          >
            UNSOLD
          </p>
          <p className="text-base sm:text-lg font-medium mt-2 text-muted-foreground">
            No bids placed — player passes
          </p>
        </div>
      </div>
    );
  }

  // ── Going Once (5s > timerSeconds > 3) ───────────────────────────────────────
  if (timerSeconds > 3 && timerSeconds <= 5) {
    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        aria-live="polite"
        aria-label="Going once!"
      >
        <div
          style={{
            animation: "dramaFadeIn 0.4s ease-out forwards",
            textShadow:
              "0 0 30px oklch(0.85 0.20 80 / 0.8), 0 0 60px oklch(0.85 0.20 80 / 0.4)",
          }}
          className="text-center select-none"
        >
          <p
            className="text-6xl sm:text-7xl font-black tracking-tight"
            style={{ color: "oklch(0.85 0.20 80)" }}
          >
            Going Once!
          </p>
          <p
            className="text-lg sm:text-xl font-semibold mt-2 opacity-80"
            style={{ color: "oklch(0.75 0.18 80)" }}
          >
            🔨 Final chance to bid...
          </p>
        </div>
      </div>
    );
  }

  // ── Going Twice (3s ≥ timerSeconds > 0) ──────────────────────────────────────
  if (timerSeconds > 0 && timerSeconds <= 3) {
    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        aria-live="polite"
        aria-label="Going twice!"
      >
        {/* Background pulse */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.65 0.22 35 / 0.12) 0%, transparent 70%)",
            animation: "dramaPulse 0.6s ease-in-out infinite alternate",
          }}
          aria-hidden
        />
        <div
          style={{
            animation:
              "dramaScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            textShadow:
              "0 0 40px oklch(0.65 0.22 35 / 0.9), 0 0 80px oklch(0.65 0.22 35 / 0.5)",
          }}
          className="text-center select-none relative z-10"
        >
          <p
            className="text-7xl sm:text-8xl font-black tracking-tight"
            style={{ color: "oklch(0.70 0.24 35)" }}
          >
            Going Twice!
          </p>
          <p
            className="text-lg sm:text-xl font-bold mt-2"
            style={{ color: "oklch(0.60 0.22 35)" }}
          >
            ⚡ Last call — bid now or lose it!
          </p>
        </div>
      </div>
    );
  }

  return null;
}
