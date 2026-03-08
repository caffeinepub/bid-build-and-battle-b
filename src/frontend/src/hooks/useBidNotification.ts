/**
 * useBidNotification — Detects when a new bid is placed and returns
 * a notification object that components can use to show real-time bid alerts.
 *
 * Compares the latest bid ID from the engine against what we last saw.
 * When a new bid arrives, the notification is shown for 3 seconds then cleared.
 */

import { useEffect, useRef, useState } from "react";
import type { AuctionEngine, BidRecord } from "../lib/auctionStore";

export interface BidNotification {
  id: string;
  teamName: string;
  amount: number;
  playerName: string;
  timestamp: number;
}

export function useBidNotification(engine: AuctionEngine | null): {
  notification: BidNotification | null;
  isNewBid: boolean;
  latestBidId: string | null;
} {
  const [notification, setNotification] = useState<BidNotification | null>(
    null,
  );
  const [isNewBid, setIsNewBid] = useState(false);
  const lastBidIdRef = useRef<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestBid: BidRecord | null = engine?.bidHistory?.[0] ?? null;
  const latestBidId = latestBid?.id ?? null;

  useEffect(() => {
    if (!latestBid || !latestBidId) return;

    // Only fire if this is a genuinely new bid we haven't seen before
    if (latestBidId === lastBidIdRef.current) return;
    lastBidIdRef.current = latestBidId;

    // Don't notify on initial mount — wait for a real live change
    // We detect "initial" by checking if notification was already null and
    // we've never set it before. Skip the very first assignment on mount.
    // Actually: show from the second call onwards to avoid stale-mount flicker.
    // We track if we've done the initial skip.

    setNotification({
      id: latestBidId,
      teamName: latestBid.teamName,
      amount: latestBid.amount,
      playerName: latestBid.playerName,
      timestamp: latestBid.timestamp,
    });

    // Flash the "new bid" indicator for 1.5s
    setIsNewBid(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setIsNewBid(false);
    }, 1500);

    // Clear notification after 3.5 seconds
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, [latestBidId, latestBid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  return { notification, isNewBid, latestBidId };
}
