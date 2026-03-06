/**
 * AuctionRoom — Phase 3 Admin Auction Control Panel.
 * Full-width status header + 3-column layout:
 *   Left: Player List Panel
 *   Center: Live Player Auction
 *   Right: Bid History
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Flag,
  Gavel,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Settings,
  SkipForward,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AppFooter from "../components/AppFooter";
import AuctionTimer from "../components/AuctionTimer";
import Modal from "../components/Modal";
import { useAuctionEngine } from "../hooks/useAuctionEngine";
import type { BidRecord, LocalPlayer } from "../lib/auctionStore";
import {
  getAuctionRooms,
  resetAllAuctionData,
  resetAuctionEngineOnly,
} from "../lib/auctionStore";
import { getAdminSession } from "../lib/authConstants";
import { formatCurrency } from "../utils/currencyFormatter";
import { getCategoryLabel, getRoleLabel } from "../utils/playerHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type EngineStatus = "waiting" | "live" | "paused" | "completed";
type PlayerAuctionStatus = "LIVE" | "SOLD" | "UNSOLD" | "UPCOMING";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayerListStatus(
  playerId: string,
  currentPlayerId: string | null,
  results: { playerId: string }[],
  playerStatus: string,
): PlayerAuctionStatus {
  if (currentPlayerId === playerId) return "LIVE";
  if (results.some((r) => r.playerId === playerId)) return "SOLD";
  if (playerStatus === "unsold") return "UNSOLD";
  return "UPCOMING";
}

function PlayerStatusBadge({ status }: { status: PlayerAuctionStatus }) {
  switch (status) {
    case "LIVE":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          LIVE
        </span>
      );
    case "SOLD":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
          SOLD
        </span>
      );
    case "UNSOLD":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
          UNSOLD
        </span>
      );
    default:
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/30 font-medium">
          UPCOMING
        </span>
      );
  }
}

// ─── Auction Status Header ────────────────────────────────────────────────────

function AuctionStatusHeader({
  isAdmin,
  status,
  auctionName,
  roomKey,
  teamsCount,
  onStart,
  onPauseResume,
  onEnd,
  onNewAuction,
  onResetEngine,
  isPaused,
  isLive,
  isWaiting,
  isCompleted,
  actionPending,
  hasEngine,
}: {
  isAdmin: boolean;
  status: EngineStatus | null;
  auctionName: string;
  roomKey: string;
  teamsCount: number;
  onStart: () => void;
  onPauseResume: () => void;
  onEnd: () => void;
  onNewAuction: () => void;
  onResetEngine: () => void;
  isPaused: boolean;
  isLive: boolean;
  isWaiting: boolean;
  isCompleted: boolean;
  actionPending: boolean;
  hasEngine: boolean;
}) {
  const statusConfig: Record<
    EngineStatus,
    { label: string; badge: string; dot?: string }
  > = {
    waiting: {
      label: "WAITING",
      badge: "bg-muted text-muted-foreground border-border border",
    },
    live: {
      label: "RUNNING",
      badge: "bg-red-500/20 text-red-400 border-red-500/40 border",
      dot: "bg-red-400 animate-pulse",
    },
    paused: {
      label: "PAUSED",
      badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 border",
    },
    completed: {
      label: "ENDED",
      badge: "bg-muted text-muted-foreground border-border border",
    },
  };

  const cfg = status ? statusConfig[status] : statusConfig.waiting;

  return (
    <div
      data-ocid="auction_header.section"
      className="card-navy rounded-2xl p-4 border border-border/50 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Auction
            </p>
            <p className="font-bold text-foreground text-sm truncate max-w-[140px]">
              {auctionName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Room Key
            </p>
            <p className="font-mono font-bold text-cyan text-sm">{roomKey}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Teams
            </p>
            <p className="font-bold text-foreground text-sm flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-pink" />
              {teamsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Status
            </p>
            <Badge
              className={`${cfg.badge} text-xs font-bold tracking-wide`}
              data-ocid="auction_header.status"
            >
              {cfg.dot && (
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`}
                />
              )}
              {cfg.label}
            </Badge>
          </div>
        </div>

        {/* Admin buttons */}
        {isAdmin && hasEngine && (
          <div className="flex flex-wrap items-center gap-2">
            {isWaiting && (
              <Button
                data-ocid="auction_header.primary_button"
                size="sm"
                onClick={onStart}
                disabled={actionPending}
                className="bg-green-600 hover:bg-green-700 text-white font-bold gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Start Auction
              </Button>
            )}
            {(isLive || isPaused) && (
              <>
                <Button
                  data-ocid="auction_header.toggle"
                  size="sm"
                  variant="outline"
                  onClick={onPauseResume}
                  disabled={actionPending}
                  className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 gap-1.5"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  data-ocid="auction_header.delete_button"
                  size="sm"
                  variant="outline"
                  onClick={onEnd}
                  disabled={actionPending}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  End Auction
                </Button>
              </>
            )}
            {isCompleted && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-muted text-muted-foreground border-border border text-xs font-medium">
                  ✓ Auction Ended
                </Badge>
                <Button
                  data-ocid="auction_header.secondary_button"
                  size="sm"
                  variant="outline"
                  onClick={onResetEngine}
                  className="border-cyan/30 text-cyan hover:bg-cyan/10 gap-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-run (same teams)
                </Button>
                <Button
                  data-ocid="auction_header.delete_button"
                  size="sm"
                  variant="outline"
                  onClick={onNewAuction}
                  className="border-pink/30 text-pink hover:bg-pink/10 gap-1.5 text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  New Auction
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Initialize Auction Form (shown when waiting) ─────────────────────────────

function InitializeAuctionForm({
  allPlayers,
  onInit,
}: {
  allPlayers: LocalPlayer[];
  onInit: (
    bidIncrement: number,
    maxSquad: number,
    maxForeign: number,
    timerDuration: number,
  ) => void;
}) {
  const [bidIncrementL, setBidIncrementL] = useState("10");
  const [maxSquad, setMaxSquad] = useState("25");
  const [maxForeign, setMaxForeign] = useState("4");
  const [timerDuration, setTimerDuration] = useState("60");

  const handleSubmit = () => {
    const increment = Math.round(Number(bidIncrementL) * 100_000);
    const squad = Number(maxSquad);
    const foreign = Number(maxForeign);
    const timer = Number(timerDuration);

    if (!increment || increment < 100_000) {
      toast.error("Bid increment must be at least ₹1L");
      return;
    }
    if (!squad || squad < 1) {
      toast.error("Max squad size must be at least 1");
      return;
    }
    if (allPlayers.length === 0) {
      toast.error(
        "No players found. Add players in Dashboard → Players first.",
      );
      return;
    }
    if (!timer || timer < 5) {
      toast.error("Timer must be at least 5 seconds");
      return;
    }
    onInit(increment, squad, foreign, timer);
  };

  return (
    <div
      data-ocid="auction_setup.panel"
      className="card-navy rounded-2xl p-5 border border-cyan/20 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-cyan" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
          Initialize Auction
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        All {allPlayers.length} players will be added to the queue
        automatically.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Bid Increment (L)
          </Label>
          <Input
            data-ocid="auction_setup.input"
            type="number"
            min="1"
            step="0.5"
            value={bidIncrementL}
            onChange={(e) => setBidIncrementL(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max Squad</Label>
          <Input
            data-ocid="auction_setup.squad_input"
            type="number"
            min="1"
            value={maxSquad}
            onChange={(e) => setMaxSquad(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max Foreign</Label>
          <Input
            data-ocid="auction_setup.foreign_input"
            type="number"
            min="0"
            value={maxForeign}
            onChange={(e) => setMaxForeign(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Timer (sec)</Label>
          <Input
            data-ocid="auction_setup.timer_input"
            type="number"
            min="5"
            max="300"
            value={timerDuration}
            onChange={(e) => setTimerDuration(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button
        data-ocid="auction_setup.primary_button"
        onClick={handleSubmit}
        disabled={allPlayers.length === 0}
        className="w-full gradient-cyan-pink text-white font-bold"
      >
        <Zap className="w-4 h-4 mr-2" />
        Initialize &amp; Start Auction
      </Button>

      {allPlayers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Add players in Dashboard → Players tab first.
        </p>
      )}
    </div>
  );
}

// ─── Left Column: Player List Panel ──────────────────────────────────────────

function PlayerListPanel({
  allPlayers,
  engine,
  isAdmin,
  isRunning,
  onActivate,
}: {
  allPlayers: LocalPlayer[];
  engine: ReturnType<typeof useAuctionEngine>["engine"];
  isAdmin: boolean;
  isRunning: boolean;
  onActivate: (playerId: string) => void;
}) {
  if (allPlayers.length === 0) {
    return (
      <div
        data-ocid="player_list.empty_state"
        className="text-center py-12 text-muted-foreground text-sm"
      >
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No players added. Go to Dashboard → Players.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
      <div className="space-y-2 pr-2">
        {allPlayers.map((player, i) => {
          const status = getPlayerListStatus(
            player.id,
            engine?.currentPlayerId ?? null,
            engine?.results ?? [],
            player.status,
          );
          const isInQueue = engine?.playerQueue.includes(player.id) ?? false;
          const canStart =
            isAdmin && isRunning && status === "UPCOMING" && isInQueue;

          return (
            <div
              key={player.id}
              data-ocid={`player_list.item.${i + 1}`}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                status === "LIVE"
                  ? "border-red-500/40 bg-red-500/5"
                  : status === "SOLD"
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-border/50 bg-card/50 hover:bg-card"
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                <img
                  src={player.photoUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/32x32/1a1a2e/00ffff?text=P";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {player.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {getRoleLabel(player.role)}
                  </span>
                  <span className="text-xs text-cyan">
                    ₹{(player.basePrice / 100_000).toFixed(0)}L
                  </span>
                  <PlayerStatusBadge status={status} />
                </div>
              </div>
              {canStart && (
                <Button
                  size="sm"
                  data-ocid={`player_list.start_button.${i + 1}`}
                  onClick={() => onActivate(player.id)}
                  className="bg-cyan/20 text-cyan border border-cyan/30 hover:bg-cyan/30 text-xs shrink-0 h-7 px-2"
                >
                  ▶ Start
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ─── Center Column: Live Auction ──────────────────────────────────────────────

function LiveAuctionCenter({
  engine,
  currentPlayerData,
  timerSeconds,
  isLive,
  isPaused,
  isAdmin,
  actionPending,
  onForceSell,
  onUnsold,
  onSkip,
  onNextPlayer,
  onReAuction,
}: {
  engine: ReturnType<typeof useAuctionEngine>["engine"];
  currentPlayerData: LocalPlayer | null;
  timerSeconds: number;
  isLive: boolean;
  isPaused: boolean;
  isAdmin: boolean;
  actionPending: boolean;
  onForceSell: () => void;
  onUnsold: () => void;
  onSkip: () => void;
  onNextPlayer: () => void;
  onReAuction: () => void;
}) {
  const currentBid = engine?.currentBid ?? 0;
  const leadingTeam = engine?.highestBidTeamName ?? "";
  const timerDuration = engine?.timerDuration ?? 15;
  const isActive = isLive || isPaused;
  const hasPlayer = !!engine?.currentPlayerId;
  const isResolved = !hasPlayer && (engine?.playerQueue.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-gradient text-2xl font-extrabold tracking-widest uppercase">
          LIVE AUCTION
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          {currentPlayerData
            ? currentPlayerData.name
            : engine?.status === "completed"
              ? "Auction completed"
              : "Waiting for player…"}
        </p>
      </div>

      {/* Player Info Card */}
      {currentPlayerData ? (
        <div className="card-navy rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
              <img
                src={currentPlayerData.photoUrl}
                alt={currentPlayerData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/64x80/1a1a2e/00ffff?text=P";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {currentPlayerData.name}
              </h2>
              {(currentPlayerData as LocalPlayer & { country?: string })
                .country && (
                <p className="text-xs text-muted-foreground">
                  🌍{" "}
                  {
                    (currentPlayerData as LocalPlayer & { country?: string })
                      .country
                  }
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge className="text-xs bg-cyan/10 text-cyan border-cyan/20 border">
                  {getRoleLabel(currentPlayerData.role)}
                </Badge>
                <Badge className="text-xs bg-pink/10 text-pink border-pink/20 border">
                  {getCategoryLabel(currentPlayerData.category)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base:{" "}
                <span className="text-cyan font-semibold">
                  ₹{(currentPlayerData.basePrice / 100_000).toFixed(0)}L
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-navy rounded-2xl p-6 border border-dashed border-border/50 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No player on auction</p>
        </div>
      )}

      {/* Timer */}
      <div className="card-navy rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Time Remaining</span>
        </div>
        <AuctionTimer
          timeLeft={isLive ? timerSeconds : timerDuration}
          totalTime={timerDuration}
          size="lg"
        />
        {timerSeconds === 0 && isLive && hasPlayer && (
          <div
            data-ocid="auction_room.error_state"
            className="flex items-center gap-1.5 text-red-400 text-sm font-bold animate-pulse"
          >
            <AlertCircle className="w-4 h-4" />
            Time&apos;s up!{" "}
            {leadingTeam ? `→ ${leadingTeam} wins!` : "→ UNSOLD"}
          </div>
        )}
      </div>

      {/* Current Bid */}
      <div className="card-navy rounded-2xl p-5 text-center space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Current Bid
        </p>
        {currentBid > 0 ? (
          <p
            data-ocid="auction_room.section"
            className="text-4xl font-extrabold text-cyan leading-none"
          >
            {formatCurrency(BigInt(Math.round(currentBid)))}
          </p>
        ) : currentPlayerData ? (
          <p className="text-2xl font-bold text-muted-foreground/60">
            Base:{" "}
            {formatCurrency(BigInt(Math.round(currentPlayerData.basePrice)))}
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground/40">—</p>
        )}
        {leadingTeam && (
          <p className="text-sm font-semibold text-pink">🏏 {leadingTeam}</p>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && isActive && hasPlayer && (
        <div
          data-ocid="auction_room.panel"
          className="card-navy rounded-2xl p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-primary" />
            Player Controls
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-ocid="auction_room.confirm_button"
              size="sm"
              onClick={onForceSell}
              disabled={!leadingTeam || actionPending}
              className="gradient-cyan-pink text-white font-bold"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Force SOLD
            </Button>
            <Button
              data-ocid="auction_room.secondary_button"
              size="sm"
              variant="outline"
              onClick={onUnsold}
              disabled={actionPending}
              className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Mark Unsold
            </Button>
            <Button
              data-ocid="auction_room.edit_button"
              size="sm"
              variant="outline"
              onClick={onSkip}
              disabled={actionPending}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1.5" />
              Skip Player
            </Button>
          </div>
        </div>
      )}

      {/* Next Player / Re-Auction buttons */}
      {isAdmin && isResolved && (
        <div className="card-navy rounded-2xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Player auction resolved. Choose next action:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-ocid="auction_room.primary_button"
              onClick={onNextPlayer}
              disabled={actionPending}
              className="bg-green-600 hover:bg-green-700 text-white font-bold gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Next Player ▶
            </Button>
            <Button
              data-ocid="auction_room.toggle"
              variant="outline"
              onClick={onReAuction}
              disabled={actionPending}
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Auction
            </Button>
          </div>
        </div>
      )}

      {/* Completed state */}
      {engine?.status === "completed" && (
        <div className="card-navy rounded-2xl p-5 text-center space-y-2 border border-green-500/20">
          <Trophy className="w-8 h-8 text-cyan mx-auto" />
          <p className="font-bold text-foreground">Auction Completed!</p>
          <p className="text-xs text-muted-foreground">
            {engine.results.length} players sold · ₹
            {(
              engine.results.reduce((s, r) => s + r.amount, 0) / 10_000_000
            ).toFixed(1)}{" "}
            Cr total
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Right Column: Bid History ────────────────────────────────────────────────

function BidHistoryPanel({
  bidHistory,
}: {
  bidHistory: BidRecord[];
}) {
  const history = bidHistory ?? [];

  return (
    <div className="card-navy rounded-2xl p-4 h-full">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-cyan" />
        Bid History
        {history.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {history.length} bids
          </span>
        )}
      </h3>
      {history.length === 0 ? (
        <div
          data-ocid="bid_history.empty_state"
          className="flex flex-col items-center justify-center py-12 gap-2 text-center"
        >
          <Radio className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No bids yet</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
          <div className="space-y-2 pr-2">
            {history.map((entry, i) => {
              const time = new Date(entry.timestamp).toLocaleTimeString(
                "en-IN",
                { timeStyle: "short" },
              );
              return (
                <div
                  key={entry.id}
                  data-ocid={`bid_history.item.${i + 1}`}
                  className={`flex items-start justify-between py-2.5 px-3 rounded-xl border transition-all ${
                    i === 0
                      ? "bg-cyan/10 border-cyan/30"
                      : "bg-muted/20 border-border/30"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {i === 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan mt-1.5 shrink-0 animate-pulse" />
                    )}
                    {i > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.teamName}
                      </p>
                      {entry.playerName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.playerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <p
                      className={`text-sm font-bold ${i === 0 ? "text-cyan" : "text-muted-foreground"}`}
                    >
                      {formatCurrency(BigInt(Math.round(entry.amount)))}
                    </p>
                    <p className="text-xs text-muted-foreground">{time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuctionRoom() {
  const navigate = useNavigate();
  const isAdmin = getAdminSession();

  const {
    engine,
    currentPlayerData,
    timerSeconds,
    isLive,
    isPaused,
    isWaiting,
    isCompleted,
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
    triggerResolutionIfExpired,
  } = useAuctionEngine();

  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [unsoldModalOpen, setUnsoldModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const rooms = getAuctionRooms();
  const auctionName = rooms[0]?.auctionName ?? "B³ Auction";
  const roomKey = rooms[0]?.roomKey ?? "—";

  // Auto-resolution
  const autoResolveRef = useRef(false);

  useEffect(() => {
    if (!isLive || !engine?.currentPlayerId) {
      autoResolveRef.current = false;
      return;
    }
    if (timerSeconds === 0 && !autoResolveRef.current) {
      autoResolveRef.current = true;
      const currentIdStr = engine.currentPlayerId;
      const upcomingIds = engine.playerQueue.filter(
        (id) => id !== currentIdStr,
      );
      const nextId = upcomingIds[0] ?? null;
      const nextPlayer = nextId
        ? allPlayers.find((p) => p.id === nextId)
        : null;
      const currentName =
        currentPlayerData?.name ??
        (engine.bidHistory[0]?.playerName || "Unknown Player");
      triggerResolutionIfExpired(
        currentName,
        nextPlayer ? nextPlayer.basePrice : null,
        nextPlayer ? nextPlayer.name : null,
      );
    } else if (timerSeconds > 0) {
      autoResolveRef.current = false;
    }
  }, [
    timerSeconds,
    isLive,
    engine,
    currentPlayerData,
    allPlayers,
    triggerResolutionIfExpired,
  ]);

  useEffect(() => {
    console.log("[B³] Connected to auction server");
    return () => {
      console.log("[B³ Socket] leaveAuction");
    };
  }, []);

  // ── Init + Start handler ──────────────────────────────────────────────────

  const handleInitAndStart = useCallback(
    async (
      bidIncrement: number,
      maxSquad: number,
      maxForeign: number,
      timerDuration: number,
    ) => {
      setActionPending(true);
      try {
        const allPlayerIds = allPlayers.map((p) => p.id);
        if (allPlayerIds.length === 0) {
          toast.error("No players found");
          return;
        }
        initAuction(
          allPlayerIds,
          bidIncrement,
          maxSquad,
          maxForeign,
          timerDuration,
        );
        const firstPlayer = allPlayers[0];
        await startAuction(firstPlayer.basePrice, firstPlayer.name);
        toast.success("Auction initialized and started! 🎉");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start");
      } finally {
        setActionPending(false);
      }
    },
    [initAuction, startAuction, allPlayers],
  );

  // Trigger start when engine is waiting but initialized (e.g. header Start button)
  const handleStartExisting = useCallback(async () => {
    if (!engine || engine.playerQueue.length === 0) {
      toast.error("No players in queue. Initialize first.");
      return;
    }
    setActionPending(true);
    try {
      const firstId = engine.playerQueue[0];
      const firstPlayer = allPlayers.find((p) => p.id === firstId);
      if (!firstPlayer) {
        toast.error("Could not find first player");
        return;
      }
      await startAuction(firstPlayer.basePrice, firstPlayer.name);
      toast.success("Auction started! 🎉");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  }, [engine, allPlayers, startAuction]);

  // ── Admin controls ────────────────────────────────────────────────────────

  const handlePauseResume = async () => {
    setActionPending(true);
    try {
      if (isPaused) {
        await resumeAuction();
        toast.success("Auction resumed!");
      } else {
        await pauseAuction();
        toast.success("Auction paused");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleForceSell = async () => {
    if (!engine?.currentPlayerId) return;
    const playerName = currentPlayerData?.name ?? "Unknown Player";
    setActionPending(true);
    try {
      await forceSell(playerName);
      toast.success(`${playerName} SOLD! ✓`);
      setSoldModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleSkip = async () => {
    setActionPending(true);
    try {
      await skipPlayer();
      toast.info("Player skipped to end of queue");
      setSkipModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleMarkUnsold = async () => {
    if (!engine?.currentPlayerId) return;
    const playerName = currentPlayerData?.name ?? "Unknown Player";
    setActionPending(true);
    try {
      const currentEng = engine;
      if (currentEng) {
        const tempEng = {
          ...currentEng,
          highestBidTeamId: null,
          highestBidTeamName: null,
        };
        const {
          resolveCurrentPlayer: resolve,
          activateNextPlayer: activate,
          saveAuctionEngine: save,
        } = await import("../lib/auctionStore");
        const resolved = resolve(tempEng, playerName);

        if (resolved.playerQueue.length > 0) {
          const nextId = resolved.playerQueue[0];
          const nextPlayer = allPlayers.find((p) => p.id === nextId);
          if (nextPlayer) {
            const activated = activate(
              resolved,
              nextId,
              nextPlayer.basePrice,
              nextPlayer.name,
            );
            save(activated);
          } else {
            save(resolved);
          }
        } else {
          resolved.status = "completed";
          resolved.lastUpdated = Date.now();
          save(resolved);
        }
      }
      toast.info(`${playerName} marked UNSOLD`);
      setUnsoldModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleEndAuction = async () => {
    setActionPending(true);
    try {
      await endAuction();
      toast.success("Auction ended");
      setEndModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  // ── New Auction handlers ──────────────────────────────────────────────────

  const handleNewAuction = () => {
    resetAllAuctionData();
    toast.success(
      "All data cleared. You can now create a new auction room, add teams and players.",
    );
    navigate({ to: "/admin/dashboard" });
  };

  const handleResetEngine = () => {
    resetAuctionEngineOnly();
    toast.success(
      "Auction reset. Same teams will run another auction. Go to Auction Room to re-initialize.",
    );
    navigate({ to: "/admin/dashboard" });
  };

  const handleNextPlayer = async () => {
    setActionPending(true);
    try {
      await loadNextPlayer();
      toast.success("Next player loaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleReAuction = async () => {
    setActionPending(true);
    try {
      await reAuctionPlayer();
      toast.success("Player re-auctioned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  const handleActivatePlayer = async (playerId: string) => {
    setActionPending(true);
    try {
      await activatePlayer(playerId);
      const player = allPlayers.find((p) => p.id === playerId);
      toast.success(`${player?.name ?? "Player"} is now LIVE`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionPending(false);
    }
  };

  // Derived
  const currentBid = engine?.currentBid ?? 0;
  const leadingTeamName = engine?.highestBidTeamName ?? "";
  const bidHistory = engine?.bidHistory ?? [];
  const showSetup = isAdmin && (!engine || isWaiting);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="nav-glass sticky top-0 z-40 px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="auction_room.link"
              onClick={() => navigate({ to: "/admin/dashboard" })}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-5 bg-border" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-cyan" />
              <span className="font-bold text-sm tracking-wide text-gradient">
                AUCTION ROOM
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {engine?.status === "live" && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 border text-xs font-bold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 animate-pulse" />
                LIVE
              </Badge>
            )}
            {isAdmin && (
              <Badge className="bg-pink/20 text-pink border-pink/30 border text-xs">
                HOST
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">
        {/* Auction Status Header */}
        <AuctionStatusHeader
          isAdmin={!!isAdmin}
          status={engine?.status ?? null}
          auctionName={auctionName}
          roomKey={roomKey}
          teamsCount={engine?.teams.length ?? 0}
          onStart={handleStartExisting}
          onPauseResume={handlePauseResume}
          onEnd={() => setEndModalOpen(true)}
          onNewAuction={handleNewAuction}
          onResetEngine={handleResetEngine}
          isPaused={isPaused}
          isLive={isLive}
          isWaiting={isWaiting}
          isCompleted={isCompleted}
          actionPending={actionPending}
          hasEngine={!!engine}
        />

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Player List Panel ──────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-pink" />
              Player List ({allPlayers.length})
            </h2>

            {/* Setup panel shown when no engine or waiting */}
            {showSetup && (
              <InitializeAuctionForm
                allPlayers={allPlayers}
                onInit={handleInitAndStart}
              />
            )}

            {/* Player List */}
            <div className="card-navy rounded-2xl p-4">
              <PlayerListPanel
                allPlayers={allPlayers}
                engine={engine}
                isAdmin={!!isAdmin}
                isRunning={isLive || isPaused}
                onActivate={handleActivatePlayer}
              />
            </div>
          </section>

          {/* ── Center: Live Player Auction ──────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan" />
              Live Auction
            </h2>
            <LiveAuctionCenter
              engine={engine}
              currentPlayerData={currentPlayerData}
              timerSeconds={timerSeconds}
              isLive={isLive}
              isPaused={isPaused}
              isAdmin={!!isAdmin}
              actionPending={actionPending}
              onForceSell={() => setSoldModalOpen(true)}
              onUnsold={() => setUnsoldModalOpen(true)}
              onSkip={() => setSkipModalOpen(true)}
              onNextPlayer={handleNextPlayer}
              onReAuction={handleReAuction}
            />
          </section>

          {/* ── Right: Bid History + Teams ───────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan" />
              Bid History
            </h2>
            <BidHistoryPanel bidHistory={bidHistory} />

            {/* Teams overview */}
            {engine && engine.teams.length > 0 && (
              <div className="card-navy rounded-2xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-pink" />
                  Teams ({engine.teams.length})
                </h3>
                <div className="space-y-2">
                  {engine.teams.map((team, i) => {
                    const isLeading = team.teamId === engine.highestBidTeamId;
                    const totalSpent = engine.results
                      .filter((r) => r.soldToTeamId === team.teamId)
                      .reduce((s, r) => s + r.amount, 0);
                    const totalBudget = team.budgetRemaining + totalSpent;
                    const pct =
                      totalBudget > 0
                        ? Math.min(
                            100,
                            (team.budgetRemaining / totalBudget) * 100,
                          )
                        : 100;
                    return (
                      <div
                        key={team.teamId}
                        data-ocid={`teams_panel.item.${i + 1}`}
                        className={`rounded-xl p-3 border transition-all ${isLeading ? "bg-cyan/10 border-cyan/30" : "bg-card/50 border-border/50"}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-semibold text-xs text-foreground truncate mr-2">
                            {team.teamName}
                            {isLeading && (
                              <span className="ml-1 text-cyan">🏏</span>
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {team.playersBought} bought
                          </span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full gradient-cyan-pink transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs font-bold text-cyan">
                          ₹{(team.budgetRemaining / 10_000_000).toFixed(1)} Cr
                          left
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results if completed */}
            {isCompleted && engine && engine.results.length > 0 && (
              <div className="card-navy rounded-xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-cyan" />
                  Sold ({engine.results.length})
                </h3>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5 pr-1">
                    {engine.results.map((r, i) => (
                      <div
                        key={`${r.playerId}-${i}`}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/20"
                      >
                        <div className="min-w-0 mr-2">
                          <p className="text-foreground truncate">
                            {r.playerName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            → {r.soldToTeamName}
                          </p>
                        </div>
                        <span className="text-cyan font-bold shrink-0">
                          {formatCurrency(BigInt(Math.round(r.amount)))}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </section>
        </div>
      </main>

      <AppFooter />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <Modal
        open={soldModalOpen}
        onOpenChange={setSoldModalOpen}
        title="Force Sell Player"
        description={
          currentPlayerData && leadingTeamName
            ? `Mark ${currentPlayerData.name} as SOLD to ${leadingTeamName} for ${formatCurrency(BigInt(Math.round(currentBid)))}?`
            : "Mark current player as SOLD?"
        }
        onConfirm={handleForceSell}
        confirmLabel="SOLD ✓"
        variant="default"
      />

      <Modal
        open={unsoldModalOpen}
        onOpenChange={setUnsoldModalOpen}
        title="Mark Unsold"
        description={
          currentPlayerData
            ? `Mark ${currentPlayerData.name} as UNSOLD? No budget will be deducted.`
            : "Mark player as UNSOLD?"
        }
        onConfirm={handleMarkUnsold}
        confirmLabel="Mark Unsold"
        variant="destructive"
      />

      <Modal
        open={skipModalOpen}
        onOpenChange={setSkipModalOpen}
        title="Skip Player"
        description={
          currentPlayerData
            ? `Move ${currentPlayerData.name} to the end of the queue?`
            : "Skip current player?"
        }
        onConfirm={handleSkip}
        confirmLabel="Skip →"
        variant="default"
      />

      <Modal
        open={endModalOpen}
        onOpenChange={setEndModalOpen}
        title="End Auction"
        description="Are you sure you want to end the auction? This cannot be undone."
        onConfirm={handleEndAuction}
        confirmLabel="End Auction"
        variant="destructive"
      />
    </div>
  );
}
