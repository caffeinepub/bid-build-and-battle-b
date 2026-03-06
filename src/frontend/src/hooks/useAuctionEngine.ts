/**
 * useAuctionEngine — central hook for real multiplayer auction state.
 * Polls localStorage (shared state) every 2s for auction engine updates.
 * Uses local player store (getLocalPlayers) for player data — no ICP canister calls.
 * All admin actions write to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AuctionEngine,
  type AuctionEngineTeam,
  type LocalPlayer,
  activateNextPlayer,
  endAuctionEngine,
  getAuctionEngine,
  getLocalPlayers,
  getTeams,
  getTimerSecondsRemaining,
  initAuctionEngine,
  pauseAuctionEngine,
  placeBidInEngine,
  reAuctionCurrentPlayer,
  resolveCurrentPlayer,
  resumeAuctionEngine,
  saveAuctionEngine,
  skipCurrentPlayer,
  startAuctionEngine,
} from "../lib/auctionStore";

export interface UseAuctionEngineResult {
  engine: AuctionEngine | null;
  currentPlayerData: LocalPlayer | null;
  timerSeconds: number;
  isLive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isWaiting: boolean;
  isLoading: boolean;
  allPlayers: LocalPlayer[];
  // Admin actions
  initAuction: (
    playerIds: string[],
    bidIncrement: number,
    maxSquadSize: number,
    maxForeignPlayers: number,
    timerDuration?: number,
  ) => void;
  startAuction: (playerBasePrice: number, playerName: string) => Promise<void>;
  pauseAuction: () => Promise<void>;
  resumeAuction: () => Promise<void>;
  skipPlayer: () => Promise<void>;
  forceSell: (playerName: string) => Promise<void>;
  endAuction: () => Promise<void>;
  reAuctionPlayer: () => Promise<void>;
  activatePlayer: (playerId: string) => Promise<void>;
  loadNextPlayer: () => Promise<void>;
  // Team action
  placeBid: (
    teamId: string,
    playerCategory: string,
  ) => Promise<{ success: boolean; error?: string }>;
  // Timer auto-resolution
  triggerResolutionIfExpired: (
    currentPlayerName: string,
    nextPlayerBasePrice: number | null,
    nextPlayerName: string | null,
  ) => void;
}

// Tracks the last resolved player to prevent double-resolution
const lastResolvedPlayerRef = { current: "" };

export function useAuctionEngine(): UseAuctionEngineResult {
  const resolutionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Poll engine state every 2s
  const [engine, setEngine] = useState<AuctionEngine | null>(() =>
    getAuctionEngine(),
  );
  const [timerSeconds, setTimerSeconds] = useState(15);
  // Poll local players every 2s
  const [allPlayers, setAllPlayers] = useState<LocalPlayer[]>(() =>
    getLocalPlayers(),
  );

  useEffect(() => {
    const poll = () => {
      const latest = getAuctionEngine();
      setEngine(latest);
      if (latest) {
        setTimerSeconds(getTimerSecondsRemaining(latest));
      }
      setAllPlayers(getLocalPlayers());
    };

    poll(); // immediate
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Also update timer every second for smooth countdown
  useEffect(() => {
    const tick = () => {
      const latest = getAuctionEngine();
      if (latest && latest.status === "live") {
        setTimerSeconds(getTimerSecondsRemaining(latest));
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Resolve current player data from engine.currentPlayerId
  const currentPlayerData: LocalPlayer | null = (() => {
    if (!engine?.currentPlayerId || allPlayers.length === 0) return null;
    return allPlayers.find((p) => p.id === engine.currentPlayerId) ?? null;
  })();

  // ── Admin actions ──────────────────────────────────────────────────────────

  const initAuction = useCallback(
    (
      playerIds: string[],
      bidIncrement: number,
      maxSquadSize: number,
      maxForeignPlayers: number,
      timerDuration = 15,
    ) => {
      // Build teams from localStorage
      const storedTeams = getTeams();
      const engineTeams: AuctionEngineTeam[] = storedTeams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        budgetRemaining: t.budgetRemaining,
        playersBought: t.playersBought,
        foreignPlayers: t.foreignPlayers,
        squad: [],
      }));

      initAuctionEngine(
        playerIds,
        engineTeams,
        bidIncrement,
        maxSquadSize,
        maxForeignPlayers,
        timerDuration,
      );

      const latest = getAuctionEngine();
      setEngine(latest);
      console.log(
        "[B³ Engine] Auction initialized with",
        playerIds.length,
        "players",
      );
    },
    [],
  );

  const startAuction = useCallback(
    async (playerBasePrice: number, playerName: string) => {
      startAuctionEngine(playerBasePrice, playerName);
      const latest = getAuctionEngine();
      setEngine(latest);
      console.log("[B³ Socket] auctionStarted");
    },
    [],
  );

  const pauseAuction = useCallback(async () => {
    pauseAuctionEngine();
    const latest = getAuctionEngine();
    setEngine(latest);
    console.log("[B³ Socket] auctionPaused");
  }, []);

  const resumeAuction = useCallback(async () => {
    resumeAuctionEngine();
    const latest = getAuctionEngine();
    setEngine(latest);
    console.log("[B³ Socket] auctionResumed");
  }, []);

  const skipPlayer = useCallback(async () => {
    skipCurrentPlayer();
    const latest = getAuctionEngine();
    setEngine(latest);

    // Activate next player if queue has items
    if (latest && latest.playerQueue.length > 0 && latest.status === "live") {
      const nextId = latest.playerQueue[0];
      const nextPlayer = allPlayers.find((p) => p.id === nextId);
      if (nextPlayer) {
        const updatedEngine = activateNextPlayer(
          getAuctionEngine()!,
          nextPlayer.id,
          nextPlayer.basePrice,
          nextPlayer.name,
        );
        saveAuctionEngine(updatedEngine);
        setEngine(updatedEngine);
      }
    }
  }, [allPlayers]);

  const forceSell = useCallback(
    async (playerName: string) => {
      const eng = getAuctionEngine();
      if (!eng || !eng.currentPlayerId) return;

      const resolved = resolveCurrentPlayer(eng, playerName);

      // Activate next player
      if (resolved.playerQueue.length > 0) {
        const nextId = resolved.playerQueue[0];
        const nextPlayer = allPlayers.find((p) => p.id === nextId);
        if (nextPlayer) {
          const activated = activateNextPlayer(
            resolved,
            nextPlayer.id,
            nextPlayer.basePrice,
            nextPlayer.name,
          );
          saveAuctionEngine(activated);
          setEngine(activated);
        } else {
          saveAuctionEngine(resolved);
          setEngine(resolved);
        }
      } else {
        // Queue empty — complete auction
        resolved.status = "completed";
        resolved.lastUpdated = Date.now();
        saveAuctionEngine(resolved);
        setEngine(resolved);
        console.log("[B³ Socket] auctionEnded");
      }
    },
    [allPlayers],
  );

  const endAuction = useCallback(async () => {
    endAuctionEngine();
    const latest = getAuctionEngine();
    setEngine(latest);
    console.log("[B³ Socket] auctionEnded");
  }, []);

  const reAuctionPlayer = useCallback(async () => {
    reAuctionCurrentPlayer();
    const latest = getAuctionEngine();
    setEngine(latest);
  }, []);

  const activatePlayer = useCallback(
    async (playerId: string) => {
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) return;
      const eng = getAuctionEngine();
      if (!eng) return;

      // If there's a current player that's live and different, resolve it as unsold first
      if (eng.currentPlayerId && eng.currentPlayerId !== playerId) {
        eng.playerQueue = eng.playerQueue.filter(
          (id) => id !== eng.currentPlayerId,
        );
        eng.currentPlayerId = null;
        eng.currentBid = 0;
        eng.highestBidTeamId = null;
        eng.highestBidTeamName = null;
      }

      // Ensure player is in queue
      if (!eng.playerQueue.includes(playerId)) {
        eng.playerQueue = [playerId, ...eng.playerQueue];
      }

      const activated = activateNextPlayer(
        eng,
        player.id,
        player.basePrice,
        player.name,
      );
      activated.status = "live";
      saveAuctionEngine(activated);
      setEngine(activated);
    },
    [allPlayers],
  );

  const loadNextPlayer = useCallback(async () => {
    const eng = getAuctionEngine();
    if (!eng || eng.playerQueue.length === 0) return;
    const nextId = eng.playerQueue[0];
    const player = allPlayers.find((p) => p.id === nextId);
    if (!player) return;
    const activated = activateNextPlayer(
      eng,
      nextId,
      player.basePrice,
      player.name,
    );
    saveAuctionEngine(activated);
    setEngine(activated);
  }, [allPlayers]);

  // ── Team action ────────────────────────────────────────────────────────────

  const placeBid = useCallback(
    async (
      teamId: string,
      playerCategory: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const result = placeBidInEngine(teamId, playerCategory);
      if (result.success) {
        const latest = getAuctionEngine();
        setEngine(latest);
      }
      return result;
    },
    [],
  );

  // ── Timer auto-resolution ──────────────────────────────────────────────────

  const triggerResolutionIfExpired = useCallback(
    (
      currentPlayerName: string,
      nextPlayerBasePrice: number | null,
      nextPlayerName: string | null,
    ) => {
      const eng = getAuctionEngine();
      if (!eng || eng.status !== "live" || !eng.currentPlayerId) return;

      const remaining = getTimerSecondsRemaining(eng);
      if (remaining > 0) return;

      // Prevent double-resolution
      const playerKey = `${eng.currentPlayerId}-${eng.lastBidTimestamp}`;
      if (lastResolvedPlayerRef.current === playerKey) return;
      lastResolvedPlayerRef.current = playerKey;

      if (resolutionTimeoutRef.current) {
        clearTimeout(resolutionTimeoutRef.current);
      }

      resolutionTimeoutRef.current = setTimeout(() => {
        // Re-check after 1s delay to be safe
        const currentEng = getAuctionEngine();
        if (!currentEng || currentEng.status !== "live") return;
        if (getTimerSecondsRemaining(currentEng) > 0) return;

        const resolved = resolveCurrentPlayer(currentEng, currentPlayerName);

        if (
          resolved.playerQueue.length > 0 &&
          nextPlayerBasePrice !== null &&
          nextPlayerName !== null
        ) {
          const nextId = resolved.playerQueue[0];
          const activated = activateNextPlayer(
            resolved,
            nextId,
            nextPlayerBasePrice,
            nextPlayerName,
          );
          saveAuctionEngine(activated);
          setEngine(activated);
        } else if (resolved.playerQueue.length === 0) {
          resolved.status = "completed";
          resolved.lastUpdated = Date.now();
          saveAuctionEngine(resolved);
          setEngine(resolved);
          console.log("[B³ Socket] auctionEnded");
        } else {
          // No next player data available yet, just save resolved
          saveAuctionEngine(resolved);
          setEngine(resolved);
        }
      }, 1000);
    },
    [],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resolutionTimeoutRef.current) {
        clearTimeout(resolutionTimeoutRef.current);
      }
    };
  }, []);

  // ── Derived flags ──────────────────────────────────────────────────────────

  const isLive = engine?.status === "live";
  const isPaused = engine?.status === "paused";
  const isCompleted = engine?.status === "completed";
  const isWaiting = !engine || engine.status === "waiting";
  const isLoading = false;

  return {
    engine,
    currentPlayerData,
    timerSeconds,
    isLive,
    isPaused,
    isCompleted,
    isWaiting,
    isLoading,
    allPlayers,
    initAuction,
    startAuction,
    pauseAuction,
    resumeAuction,
    skipPlayer,
    forceSell,
    endAuction,
    reAuctionPlayer,
    activatePlayer,
    loadNextPlayer,
    placeBid,
    triggerResolutionIfExpired,
  };
}
