/**
 * useSoundEffects — wires sound effects to auction engine state changes.
 * Plays sounds when: bid is placed, timer is counting down, player is sold.
 */

import { useEffect, useRef } from "react";
import type { AuctionEngine } from "../lib/auctionStore";
import {
  playBidSound,
  playChimeSound,
  playCountdownBeep,
  playSoldSound,
} from "../lib/soundEngine";

export function useSoundEffects(engine: AuctionEngine | null): void {
  // Track bid history length to detect new bids
  const prevBidHistoryLength = useRef(0);
  // Track timer to detect countdown moments (fire once per second value)
  const prevTimerRef = useRef<number | null>(null);
  // Track resolution: when highestBidder appears and timer hits 0
  const soldFiredRef = useRef(false);
  const prevPlayerIdRef = useRef<string | null>(null);

  // Derive timer seconds from engine (same logic as useAuctionEngine)
  const timerSeconds = (() => {
    if (!engine || engine.status !== "live") return null;
    const duration =
      engine.highestBidTeamId !== null
        ? (engine.bidTimerDuration ?? engine.timerDuration ?? 10)
        : (engine.initialTimerDuration ?? engine.timerDuration ?? 15);
    return Math.max(
      0,
      Math.round(duration - (Date.now() - engine.lastBidTimestamp) / 1000),
    );
  })();

  // Reset sold-fired flag when a new player comes up
  useEffect(() => {
    const currentId = engine?.currentPlayerId ?? null;
    if (currentId !== prevPlayerIdRef.current) {
      prevPlayerIdRef.current = currentId;
      soldFiredRef.current = false;
    }
  }, [engine?.currentPlayerId]);

  // Bid sound: fire when bid history grows
  useEffect(() => {
    const currentLength = engine?.bidHistory.length ?? 0;
    if (currentLength > prevBidHistoryLength.current) {
      prevBidHistoryLength.current = currentLength;
      playBidSound();
      // Small delay then chime for "new highest bid" excitement
      setTimeout(() => playChimeSound(), 100);
    }
  }, [engine?.bidHistory.length]);

  // Countdown beep: fire at 5, 4, 3, 2, 1
  useEffect(() => {
    if (timerSeconds === null) return;
    if (engine?.status !== "live") return;
    if (!engine?.currentPlayerId) return;

    const prev = prevTimerRef.current;
    prevTimerRef.current = timerSeconds;

    // Only fire once per integer value change
    if (prev === timerSeconds) return;

    if (timerSeconds >= 1 && timerSeconds <= 5) {
      playCountdownBeep();
    }
  }, [timerSeconds, engine?.status, engine?.currentPlayerId]);

  // Sold sound: fire when timer hits 0 and there's a highest bidder
  useEffect(() => {
    if (timerSeconds !== 0) return;
    if (engine?.status !== "live") return;
    if (!engine?.currentPlayerId) return;
    if (soldFiredRef.current) return;

    if (engine.highestBidTeamId) {
      soldFiredRef.current = true;
      playSoldSound();
    }
  }, [
    timerSeconds,
    engine?.status,
    engine?.currentPlayerId,
    engine?.highestBidTeamId,
  ]);
}
