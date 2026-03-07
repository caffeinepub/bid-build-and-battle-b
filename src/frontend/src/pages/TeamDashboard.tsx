import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Clock,
  LogOut,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import BidHighlight from "../components/BidHighlight";
import ConfirmModal from "../components/ConfirmModal";
import SkeletonLoader from "../components/SkeletonLoader";
import { useAuctionEngine } from "../hooks/useAuctionEngine";
import { clearTeamSession, getTeamSession } from "../lib/auctionStore";
import {
  formatCurrency,
  getCategoryBadgeColor,
  getCategoryLabel,
  getRoleColor,
  getRoleLabel,
} from "../utils/playerHelpers";

export default function TeamDashboard() {
  const navigate = useNavigate();
  const session = getTeamSession();

  const {
    engine,
    currentPlayerData,
    timerSeconds,
    isLive,
    isPaused,
    isCompleted,
    isWaiting,
    isLoading,
    allPlayers,
    placeBid,
  } = useAuctionEngine();

  const [confirmBid, setConfirmBid] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const prevPlayerIdRef = useRef<string | null>(null);

  // Reset confirm on new player
  useEffect(() => {
    const playerId = engine?.currentPlayerId ?? null;
    if (playerId !== prevPlayerIdRef.current) {
      prevPlayerIdRef.current = playerId;
      setConfirmBid(false);
    }
  }, [engine?.currentPlayerId]);

  const handleLogout = () => {
    clearTeamSession();
    void navigate({ to: "/team/login" });
  };

  // Get my team from engine
  const myEngineTeam = session
    ? (engine?.teams.find((t) => t.teamId === session.teamId) ?? null)
    : null;

  // Budget values from engine (fallback to session)
  const totalBudget = myEngineTeam
    ? myEngineTeam.budgetRemaining +
      (engine?.results
        .filter((r) => r.soldToTeamId === session?.teamId)
        .reduce((sum, r) => sum + r.amount, 0) ?? 0)
    : session
      ? session.budgetRemaining
      : 100_000_000;

  const remainingBudget = myEngineTeam
    ? myEngineTeam.budgetRemaining
    : session
      ? session.budgetRemaining
      : 100_000_000;

  const budgetPercent =
    totalBudget > 0
      ? Math.min(100, Math.max(0, (remainingBudget / totalBudget) * 100))
      : 100;
  const isBudgetLow = budgetPercent < 20;

  // Current bid values from engine
  const currentBid = engine?.currentBid ?? 0;
  const leadingTeam = engine?.highestBidTeamName ?? "";
  const bidHistory = engine?.bidHistory ?? [];
  const bidIncrement = engine?.bidIncrement ?? 500_000;
  const nextBidAmount = currentBid + bidIncrement;

  // Player category for foreign player validation
  const playerCategory = currentPlayerData?.category ?? null;

  // Validate if team can bid
  const canBidResult = (() => {
    if (!isLive) return { canBid: false, reason: "Auction is not live" };
    if (!engine?.currentPlayerId)
      return { canBid: false, reason: "No player on auction" };
    if (!session) return { canBid: false, reason: "Not logged in" };

    if (!myEngineTeam) {
      return {
        canBid: false,
        reason: "Waiting for admin to start the auction",
      };
    }

    if (myEngineTeam.budgetRemaining < nextBidAmount) {
      return {
        canBid: false,
        reason: `Insufficient budget (need ₹${(nextBidAmount / 100_000).toFixed(0)}L)`,
      };
    }

    if (myEngineTeam.playersBought >= (engine?.maxSquadSize ?? 25)) {
      return { canBid: false, reason: "Squad is full" };
    }

    const isOverseas = playerCategory === "foreign";
    if (
      isOverseas &&
      myEngineTeam.foreignPlayers >= (engine?.maxForeignPlayers ?? 4)
    ) {
      return {
        canBid: false,
        reason: "Foreign player limit reached",
      };
    }

    return { canBid: true, reason: null };
  })();

  const canBid = canBidResult.canBid;
  const bidDisabledReason = canBidResult.reason;

  const handlePlaceBid = async () => {
    if (!session || !engine?.currentPlayerId) return;
    setIsBidding(true);
    try {
      const result = await placeBid(
        session.teamId,
        playerCategory ?? "cappedIndian",
      );
      if (result.success) {
        toast.success(
          `Bid of ${formatCurrency(BigInt(Math.round(nextBidAmount)))} placed!`,
        );
      } else {
        toast.error(result.error ?? "Bid failed");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bid failed");
    } finally {
      setIsBidding(false);
      setConfirmBid(false);
    }
  };

  // Timer color
  const timerColor =
    timerSeconds <= 10
      ? "text-destructive animate-timer-pulse"
      : timerSeconds <= 20
        ? "text-chart-4"
        : "text-cyan";

  // Squad player names from engine + allPlayers
  const mySquadPlayers =
    myEngineTeam?.squad
      .map((pid) => allPlayers.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => p !== undefined) ?? [];

  // Auction status label
  const statusLabel = isLive
    ? "🔴 Auction is LIVE"
    : isPaused
      ? "⏸ Auction Paused"
      : isCompleted
        ? "✅ Auction Completed"
        : "⏳ Auction Not Started";

  const statusClass = isLive
    ? "bg-chart-3/10 border-chart-3/20"
    : isPaused
      ? "bg-chart-4/10 border-chart-4/20"
      : "bg-secondary border-border";

  const statusDotClass = isLive
    ? "bg-chart-3 animate-pulse"
    : isPaused
      ? "bg-chart-4"
      : "bg-muted-foreground";

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
              alt="B³ Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {session?.teamName ?? "Team Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Team Owner Dashboard
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            data-ocid="team_dashboard.button"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        {/* Auction Status Banner */}
        <div
          className={`flex items-center gap-3 p-3 rounded-xl mb-6 border ${statusClass}`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${statusDotClass}`} />
          <span className="text-sm font-medium text-foreground">
            {statusLabel}
          </span>
          {isWaiting && !myEngineTeam && (
            <span className="text-xs text-muted-foreground ml-auto">
              Waiting for admin to initialize auction
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Live Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Player Card */}
            <div className="card-navy rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">
                  Current Player
                </h2>
                <div className="flex items-center gap-2">
                  {/* Player auction status badge */}
                  {isLive && engine?.currentPlayerId && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {isPaused && engine?.currentPlayerId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
                      PAUSED
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
                      ENDED
                    </span>
                  )}
                  {isWaiting && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                      WAITING
                    </span>
                  )}
                  {isLive && engine?.currentPlayerId && (
                    <div
                      data-ocid="team_dashboard.section"
                      className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${timerColor}`}
                    >
                      <Clock className="w-5 h-5" />
                      {timerSeconds}s
                    </div>
                  )}
                </div>
              </div>

              {isLoading && !engine ? (
                <SkeletonLoader variant="list" count={1} />
              ) : currentPlayerData ? (
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Player Photo */}
                  <PlayerPhotoDisplay player={currentPlayerData} />

                  {/* Player Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {currentPlayerData.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge
                          className={`text-xs border-0 ${getRoleColor(currentPlayerData.role)}`}
                        >
                          {getRoleLabel(currentPlayerData.role)}
                        </Badge>
                        <Badge
                          className={`text-xs ${getCategoryBadgeColor(currentPlayerData.category)}`}
                        >
                          {getCategoryLabel(currentPlayerData.category)}
                        </Badge>
                      </div>
                      {currentPlayerData.stats && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {currentPlayerData.stats}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                          Base Price
                        </p>
                        <p className="text-sm font-bold text-cyan">
                          {formatCurrency(
                            BigInt(Math.round(currentPlayerData.basePrice)),
                          )}
                        </p>
                      </div>
                      <BidHighlight
                        trigger={BigInt(Math.round(currentBid))}
                        className="bg-secondary rounded-lg p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          Current Bid
                        </p>
                        <p className="text-sm font-bold text-pink">
                          {formatCurrency(BigInt(Math.round(currentBid)))}
                        </p>
                      </BidHighlight>
                    </div>

                    {leadingTeam && (
                      <div className="flex items-center gap-2 p-2 bg-cyan/10 rounded-lg border border-cyan/20">
                        <TrendingUp className="w-4 h-4 text-cyan" />
                        <span className="text-sm text-cyan font-medium">
                          Leading: {leadingTeam}
                        </span>
                      </div>
                    )}

                    {/* BID BUTTON */}
                    <div className="space-y-2">
                      <Button
                        data-ocid="team_dashboard.primary_button"
                        onClick={() => setConfirmBid(true)}
                        disabled={!canBid || isBidding}
                        className="w-full h-14 text-lg font-bold rounded-xl gradient-cyan-pink text-white hover:opacity-90 disabled:opacity-50 shadow-cyan-glow transition-all"
                        style={{ minHeight: "48px" }}
                      >
                        {isBidding ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Placing Bid...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            BID{" "}
                            {formatCurrency(BigInt(Math.round(nextBidAmount)))}
                          </span>
                        )}
                      </Button>
                      {bidDisabledReason && (
                        <p
                          data-ocid="team_dashboard.error_state"
                          className="text-xs text-muted-foreground flex items-center gap-1 justify-center"
                        >
                          <AlertCircle className="w-3 h-3" />{" "}
                          {bidDisabledReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    No player on auction right now.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isWaiting
                      ? "Wait for the host to start the auction."
                      : isCompleted
                        ? "Auction has ended."
                        : "Wait for the host to put up the next player."}
                  </p>
                </div>
              )}
            </div>

            {/* Bid History */}
            {bidHistory.length > 0 && (
              <div className="card-navy rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Bid History
                </h3>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {bidHistory.map((bid, i) => (
                      <div
                        key={bid.id}
                        data-ocid={`bid_history.item.${i + 1}`}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${i === 0 ? "bg-cyan/10 border border-cyan/20" : "bg-secondary"}`}
                      >
                        <div className="flex items-center gap-2">
                          {i === 0 && (
                            <TrendingUp className="w-3.5 h-3.5 text-cyan" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {bid.teamName}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-bold ${i === 0 ? "text-cyan" : "text-muted-foreground"}`}
                        >
                          {formatCurrency(BigInt(Math.round(bid.amount)))}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right: Budget & Squad */}
          <div className="space-y-4">
            {/* Budget Tracker */}
            <div className="card-navy rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan" /> Budget Tracker
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span
                    className={`font-bold ${isBudgetLow ? "text-destructive" : "text-cyan"}`}
                  >
                    {formatCurrency(BigInt(Math.round(remainingBudget)))}
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isBudgetLow ? "bg-destructive" : "gradient-cyan-pink"}`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Spent:{" "}
                    {formatCurrency(
                      BigInt(Math.round(totalBudget - remainingBudget)),
                    )}
                  </span>
                  <span>
                    Total: {formatCurrency(BigInt(Math.round(totalBudget)))}
                  </span>
                </div>
                {isBudgetLow && (
                  <div className="flex items-center gap-1.5 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive">
                      Less than 20% budget remaining!
                    </span>
                  </div>
                )}
                {myEngineTeam && (
                  <p className="text-xs text-muted-foreground">
                    {myEngineTeam.playersBought} players bought ·{" "}
                    {myEngineTeam.foreignPlayers} foreign
                  </p>
                )}
              </div>
            </div>

            {/* My Squad */}
            <div className="card-navy rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-pink" /> My Squad (
                {mySquadPlayers.length})
              </h3>
              {mySquadPlayers.length === 0 ? (
                <div
                  data-ocid="team_squad.empty_state"
                  className="text-center py-8"
                >
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    No players acquired yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start bidding to build your squad!
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {mySquadPlayers.map((player, i) => {
                      const resultEntry = engine?.results.find(
                        (r) =>
                          r.playerId === player.id &&
                          r.soldToTeamId === session?.teamId,
                      );
                      const soldPrice = resultEntry?.amount ?? null;
                      return (
                        <div
                          key={player.name}
                          data-ocid={`team_squad.item.${i + 1}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {player.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getRoleLabel(player.role)}
                            </p>
                          </div>
                          <div className="shrink-0 ml-2 text-right">
                            {soldPrice !== null && (
                              <p className="text-xs font-bold text-cyan">
                                {formatCurrency(BigInt(Math.round(soldPrice)))}
                              </p>
                            )}
                            <Badge
                              className={`text-xs ${getCategoryBadgeColor(player.category)}`}
                            >
                              {getCategoryLabel(player.category)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Results summary if completed */}
            {isCompleted && engine && engine.results.length > 0 && (
              <div className="card-navy rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-cyan" /> Auction Results
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Total players sold: {engine.results.length}
                </p>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {engine.results
                      .filter((r) => r.soldToTeamId === session?.teamId)
                      .map((r) => (
                        <div
                          key={`${r.playerId}-${r.timestamp}`}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-cyan/10 border border-cyan/20"
                        >
                          <span className="text-foreground truncate mr-2">
                            {r.playerName}
                          </span>
                          <span className="text-cyan font-bold shrink-0">
                            {formatCurrency(BigInt(Math.round(r.amount)))}
                          </span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />

      <ConfirmModal
        open={confirmBid}
        title="Place Bid"
        message={`Place a bid of ${formatCurrency(BigInt(Math.round(nextBidAmount)))} for ${currentPlayerData?.name ?? "this player"}? This cannot be undone.`}
        confirmLabel={`Bid ${formatCurrency(BigInt(Math.round(nextBidAmount)))}`}
        variant="success"
        onConfirm={handlePlaceBid}
        onCancel={() => setConfirmBid(false)}
        isLoading={isBidding}
      />
    </div>
  );
}

function PlayerPhotoDisplay({
  player,
}: { player: { photoUrl?: string; name: string } }) {
  return (
    <div className="w-32 h-40 rounded-xl overflow-hidden bg-navy-mid flex-shrink-0 border border-border">
      {player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt={player.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
          🏏
        </div>
      )}
    </div>
  );
}
