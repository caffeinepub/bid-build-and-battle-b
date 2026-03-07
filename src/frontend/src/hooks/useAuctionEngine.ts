/**
 * useAuctionEngine — central hook for real multiplayer auction state.
 * Polls localStorage AND the Motoko backend every 2s for auction engine updates.
 * When backend has a newer engine (by lastUpdated), it wins and is written to
 * localStorage — enabling cross-device real-time sync.
 * All admin actions write to localStorage (and auto-sync to backend via backendSync).
 */

import { useCallback, useEffect, useRef, useState } from "react";
// Import backendSync to activate its self-registration side-effect
import "../lib/backendSync";
import {
  type AuctionEngine,
  type AuctionEngineTeam,
  type LocalPlayer,
  activateNextPlayer,
  endAuctionEngine,
  getAuctionEngine,
  getAuctionRooms,
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
  saveAuctionRooms,
  saveLocalPlayers,
  saveTeams,
  skipCurrentPlayer,
  startAuctionEngine,
  subscribeToEngineUpdates,
} from "../lib/auctionStore";
import {
  fetchEngineFromBackend,
  fetchPlayersFromBackend,
  fetchRoomsFromBackend,
  fetchTeamsFromBackend,
  syncEngineToBackend,
} from "../lib/backendSync";

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
  /** Immediately clears engine + allPlayers from React state (call before wiping backend). */
  clearEngineState: () => void;
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
  // When true, the poll will skip backend restore (prevents re-hydrating wiped data)
  const wipePendingRef = useRef(false);
  const wipePendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Poll engine state every 2s
  const [engine, setEngine] = useState<AuctionEngine | null>(() =>
    getAuctionEngine(),
  );
  const [timerSeconds, setTimerSeconds] = useState(60);
  // Poll local players every 2s
  const [allPlayers, setAllPlayers] = useState<LocalPlayer[]>(() =>
    getLocalPlayers(),
  );

  /** Immediately null out engine + players in React state and block poll restore for 10s */
  const clearEngineState = useCallback(() => {
    wipePendingRef.current = true;
    setEngine(null);
    setAllPlayers([]);
    // Allow polling to resume after 10 seconds (enough time for backend wipe to propagate)
    if (wipePendingTimerRef.current) clearTimeout(wipePendingTimerRef.current);
    wipePendingTimerRef.current = setTimeout(() => {
      wipePendingRef.current = false;
    }, 10_000);
  }, []);

  useEffect(() => {
    const poll = async () => {
      // Skip restore if a wipe is in progress
      if (wipePendingRef.current) return;

      // 1. Try fetching from backend — if it has a newer engine, use it
      try {
        const [backendEngine, backendPlayers, backendTeams, backendRooms] =
          await Promise.all([
            fetchEngineFromBackend(),
            fetchPlayersFromBackend(),
            fetchTeamsFromBackend(),
            fetchRoomsFromBackend(),
          ]);

        // Always sync teams and rooms from backend so all devices see the same data
        if (backendTeams && backendTeams.length > 0) {
          const localTeams = getTeams();
          // Merge: backend wins for approval status; local data preserved otherwise
          const mergedTeams = backendTeams.map((bt) => {
            const lt = localTeams.find((t) => t.teamId === bt.teamId);
            return lt ? { ...lt, approvalStatus: bt.approvalStatus } : bt;
          });
          // Add any local teams not yet on backend
          const backendIds = new Set(backendTeams.map((t) => t.teamId));
          for (const lt of localTeams) {
            if (!backendIds.has(lt.teamId)) mergedTeams.push(lt);
          }
          saveTeams(mergedTeams);
        }
        if (backendRooms && backendRooms.length > 0) {
          const localRooms = getAuctionRooms();
          if (localRooms.length === 0) {
            saveAuctionRooms(backendRooms);
          }
        }

        const localEngine = getAuctionEngine();

        if (
          backendEngine &&
          (!localEngine ||
            backendEngine.lastUpdated > (localEngine.lastUpdated ?? 0))
        ) {
          // Backend has newer state — write to localStorage and update React state
          // Also ensure all known teams are in the engine's teams list
          const allTeams = getTeams();
          const engineTeamIds = new Set(
            backendEngine.teams.map((t) => t.teamId),
          );
          for (const t of allTeams) {
            if (
              !engineTeamIds.has(t.teamId) &&
              t.approvalStatus === "approved"
            ) {
              backendEngine.teams.push({
                teamId: t.teamId,
                teamName: t.teamName,
                budgetRemaining: t.budgetRemaining,
                playersBought: t.playersBought,
                foreignPlayers: t.foreignPlayers,
                squad: [],
              });
            }
          }
          saveAuctionEngine(backendEngine);
          setEngine(backendEngine);
          setTimerSeconds(getTimerSecondsRemaining(backendEngine));
        } else {
          const latest = getAuctionEngine();
          setEngine(latest);
          if (latest) {
            setTimerSeconds(getTimerSecondsRemaining(latest));
          }
        }

        // Merge backend players if local is empty
        if (backendPlayers && backendPlayers.length > 0) {
          const localPlayers = getLocalPlayers();
          if (localPlayers.length === 0) {
            saveLocalPlayers(backendPlayers);
            setAllPlayers(backendPlayers);
          } else {
            setAllPlayers(getLocalPlayers());
          }
        } else {
          setAllPlayers(getLocalPlayers());
        }
      } catch {
        // Backend unavailable — fall back to localStorage
        const latest = getAuctionEngine();
        setEngine(latest);
        if (latest) {
          setTimerSeconds(getTimerSecondsRemaining(latest));
        }
        setAllPlayers(getLocalPlayers());
      }
    };

    void poll(); // immediate
    const id = setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      clearInterval(id);
      if (wipePendingTimerRef.current)
        clearTimeout(wipePendingTimerRef.current);
    };
  }, []);

  // BroadcastChannel: instantly receive engine updates from other tabs on same device
  useEffect(() => {
    const unsubscribe = subscribeToEngineUpdates((updatedEngine) => {
      setEngine(updatedEngine);
      setTimerSeconds(getTimerSecondsRemaining(updatedEngine));
    });
    return unsubscribe;
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
      timerDuration = 60,
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
      // Step 1: Sync latest engine from backend before placing bid.
      // This ensures we're bidding on the most up-to-date state, even if
      // another device placed a bid within the last 2s poll window.
      try {
        const backendEngine = await fetchEngineFromBackend();
        if (backendEngine) {
          const localEngine = getAuctionEngine();
          if (
            !localEngine ||
            backendEngine.lastUpdated > (localEngine.lastUpdated ?? 0)
          ) {
            saveAuctionEngine(backendEngine);
          }
        }
      } catch {
        // Continue with local state if backend unavailable
      }

      // Step 2: Place the bid against the freshest local engine
      const result = placeBidInEngine(teamId, playerCategory);
      if (result.success) {
        const latest = getAuctionEngine();
        setEngine(latest);
        // Step 3: Immediately push updated engine to backend (don't wait for 2s poll)
        if (latest) {
          syncEngineToBackend(latest);
        }
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
    clearEngineState,
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
