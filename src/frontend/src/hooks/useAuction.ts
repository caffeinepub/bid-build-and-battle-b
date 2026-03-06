/**
 * useAuction — central hook for live auction state.
 * Polls currentPlayer, currentAuctionState, and players on intervals.
 * Tracks local bid state: currentBid, leadingTeam, bidHistory.
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuctionStatus, PlayerCategory, PlayerRole } from "../backend";
import type { Player } from "../backend";
import { useActor } from "./useActor";

export interface BidHistoryEntry {
  id: string;
  team: string;
  amount: bigint;
  timestamp: number;
}

export interface UseAuctionResult {
  currentPlayer: Player | null;
  auctionState: AuctionStatus | null;
  players: Array<[bigint, Player]>;
  currentBid: bigint;
  leadingTeam: string;
  bidHistory: BidHistoryEntry[];
  isLive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  placeBid: (teamName: string, amount: bigint) => void;
  resetBidState: () => void;
}

export function useAuction(): UseAuctionResult {
  const { actor, isFetching: actorFetching } = useActor();

  // ── Backend polling ──────────────────────────────────────────────────────
  const { data: currentPlayer = null, isLoading: playerLoading } =
    useQuery<Player | null>({
      queryKey: ["currentPlayer"],
      queryFn: async () => {
        if (!actor) return null;
        return actor.currentPlayer();
      },
      enabled: !!actor && !actorFetching,
      refetchInterval: 2000,
    });

  const { data: auctionState = null, isLoading: stateLoading } =
    useQuery<AuctionStatus | null>({
      queryKey: ["currentAuctionState"],
      queryFn: async () => {
        if (!actor) return null;
        return actor.currentAuctionState();
      },
      enabled: !!actor && !actorFetching,
      refetchInterval: 2000,
    });

  const { data: players = [], isLoading: playersLoading } = useQuery<
    Array<[bigint, Player]>
  >({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayers();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
  });

  // ── Local bid state ──────────────────────────────────────────────────────
  const [currentBid, setCurrentBid] = useState<bigint>(0n);
  const [leadingTeam, setLeadingTeam] = useState<string>("");
  const [bidHistory, setBidHistory] = useState<BidHistoryEntry[]>([]);

  // Track previous player to reset bid state when player changes
  const prevPlayerRef = useRef<string | null>(null);

  useEffect(() => {
    const playerName = currentPlayer?.name ?? null;
    if (playerName !== prevPlayerRef.current) {
      prevPlayerRef.current = playerName;
      // Reset bid state for new player
      if (currentPlayer) {
        setCurrentBid(currentPlayer.basePrice);
        setLeadingTeam("");
        setBidHistory([]);
        console.log(
          "[B³ Socket] auctionStarted — new player up for bid:",
          playerName,
        );
      }
    }
  }, [currentPlayer]);

  // ── Socket event simulation ──────────────────────────────────────────────
  const prevAuctionStateRef = useRef<AuctionStatus | null>(null);

  useEffect(() => {
    if (auctionState !== prevAuctionStateRef.current) {
      prevAuctionStateRef.current = auctionState;
      if (auctionState === AuctionStatus.live) {
        console.log("[B³ Socket] auctionStarted");
      } else if (auctionState === AuctionStatus.paused) {
        console.log("[B³ Socket] auctionPaused");
      } else if (auctionState === AuctionStatus.completed) {
        console.log("[B³ Socket] auctionEnded");
      }
    }
  }, [auctionState]);

  // ── Place bid (local optimistic) ─────────────────────────────────────────
  const placeBid = useCallback((teamName: string, amount: bigint) => {
    setCurrentBid(amount);
    setLeadingTeam(teamName);
    setBidHistory((prev) => {
      const entry: BidHistoryEntry = {
        id: `${teamName}-${Date.now()}`,
        team: teamName,
        amount,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev].slice(0, 10);
      console.log("[B³ Socket] newBidPlaced —", teamName, amount.toString());
      return next;
    });
  }, []);

  const resetBidState = useCallback(() => {
    setCurrentBid(currentPlayer?.basePrice ?? 0n);
    setLeadingTeam("");
    setBidHistory([]);
  }, [currentPlayer]);

  // ── Derived flags ────────────────────────────────────────────────────────
  const isLive = auctionState === AuctionStatus.live;
  const isPaused = auctionState === AuctionStatus.paused;
  const isCompleted = auctionState === AuctionStatus.completed;
  const isLoading =
    actorFetching || playerLoading || stateLoading || playersLoading;

  return {
    currentPlayer,
    auctionState,
    players,
    currentBid,
    leadingTeam,
    bidHistory,
    isLive,
    isPaused,
    isCompleted,
    isLoading,
    placeBid,
    resetBidState,
  };
}

// Re-export types for consumers
export { AuctionStatus, PlayerRole, PlayerCategory };
