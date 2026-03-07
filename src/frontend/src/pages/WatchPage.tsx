import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Eye, Radio, TrendingUp, Trophy, Users } from "lucide-react";
import React from "react";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import BidHighlight from "../components/BidHighlight";
import SkeletonLoader from "../components/SkeletonLoader";
import { useAuctionEngine } from "../hooks/useAuctionEngine";
import type { LocalPlayer } from "../lib/auctionStore";
import {
  formatCurrency,
  getCategoryBadgeColor,
  getCategoryLabel,
  getRoleColor,
  getRoleLabel,
} from "../utils/playerHelpers";

function PlayerPhoto({ player }: { player: LocalPlayer }) {
  return (
    <div className="w-full h-full">
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
        <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
          🏏
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
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
  } = useAuctionEngine();

  const currentBid = engine?.currentBid ?? 0;
  const leadingTeam = engine?.highestBidTeamName ?? "";
  const bidFeed = engine?.bidHistory ?? [];
  const teams = engine?.teams ?? [];

  const timerColor =
    timerSeconds <= 10
      ? "text-destructive animate-timer-pulse"
      : timerSeconds <= 20
        ? "text-chart-4"
        : "text-cyan";

  const statusConfig = isLive
    ? {
        label: "🔴 LIVE",
        bg: "bg-chart-3/10 border-chart-3/30",
        dot: "bg-chart-3 animate-pulse",
        text: "text-chart-3",
      }
    : isPaused
      ? {
          label: "⏸ Paused",
          bg: "bg-chart-4/10 border-chart-4/30",
          dot: "bg-chart-4",
          text: "text-chart-4",
        }
      : isCompleted
        ? {
            label: "✅ Completed",
            bg: "bg-cyan/10 border-cyan/30",
            dot: "bg-cyan",
            text: "text-cyan",
          }
        : {
            label: "⏳ Not Started",
            bg: "bg-secondary border-border",
            dot: "bg-muted-foreground",
            text: "text-muted-foreground",
          };

  const totalPlayers = allPlayers.length;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Cricket Hero Banner */}
        <div
          className="relative rounded-2xl overflow-hidden mb-8 px-6 py-6 sm:px-8 sm:py-7"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.11 0.04 255) 0%, oklch(0.14 0.05 225) 50%, oklch(0.13 0.04 255) 100%)",
            border: "1px solid oklch(0.82 0.18 85 / 0.2)",
          }}
        >
          {/* Subtle field lines */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            aria-hidden
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, oklch(0.58 0.18 145) 0px, oklch(0.58 0.18 145) 1px, transparent 1px, transparent 40px)",
            }}
          />
          {/* Gold left accent bar */}
          <div
            className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
            style={{ background: "oklch(0.82 0.18 85)" }}
          />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
                alt="B³"
                className="h-14 w-auto object-contain flex-shrink-0"
                style={{
                  filter: "drop-shadow(0 0 10px oklch(0.82 0.18 85 / 0.3))",
                }}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-live-pulse" />
                      🔴 LIVE AUCTION
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-muted/50 border border-border text-muted-foreground">
                      <Radio className="w-3 h-3" />
                      Live Auction Viewer
                    </span>
                  )}
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.78 0.18 195))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  🏏 Bid Build Battle
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Watch the live IPL auction in real time — no login required
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-gold" />
                <span className="text-gold font-semibold">
                  {totalPlayers} players
                </span>
              </span>
              {teams.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan" />
                  <span className="text-cyan font-semibold">
                    {teams.length} teams
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner — compact secondary row */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border mb-6 ${statusConfig.bg}`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.dot}`} />
            <span className={`text-sm font-semibold ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Bid Build Battle (B³)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Current Player */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className={`rounded-2xl overflow-hidden shadow-card transition-all duration-500 ${isLive && currentPlayerData ? "live-player-glow" : "card-navy"}`}
            >
              {/* Card Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{
                  borderColor:
                    isLive && currentPlayerData
                      ? "oklch(0.82 0.18 85 / 0.2)"
                      : "oklch(var(--border))",
                }}
              >
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan" />
                  Current Player on Auction
                </h2>
                {isLive && currentPlayerData && (
                  <div
                    className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${timerColor}`}
                  >
                    <Clock className="w-5 h-5" />
                    {timerSeconds}s
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6">
                {isLoading && !engine ? (
                  <SkeletonLoader variant="list" count={1} />
                ) : currentPlayerData ? (
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Photo */}
                    <div className="w-full sm:w-48 h-56 sm:h-64 rounded-xl overflow-hidden bg-navy-mid border border-border flex-shrink-0">
                      <PlayerPhoto player={currentPlayerData} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {currentPlayerData.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
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
                          <p className="text-sm text-muted-foreground mt-2">
                            {currentPlayerData.stats}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="rounded-xl p-4"
                          style={{
                            background: "oklch(0.58 0.18 145 / 0.08)",
                            border: "1px solid oklch(0.58 0.18 145 / 0.2)",
                          }}
                        >
                          <p
                            className="text-xs font-medium mb-1"
                            style={{ color: "oklch(0.58 0.18 145)" }}
                          >
                            🏏 Base Price
                          </p>
                          <p
                            className="text-lg font-bold"
                            style={{ color: "oklch(0.68 0.20 145)" }}
                          >
                            {formatCurrency(
                              BigInt(Math.round(currentPlayerData.basePrice)),
                            )}
                          </p>
                        </div>
                        <BidHighlight
                          trigger={BigInt(Math.round(currentBid))}
                          className="bg-secondary rounded-xl p-4"
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            Current Bid
                          </p>
                          <p className="text-lg font-bold text-pink">
                            {formatCurrency(BigInt(Math.round(currentBid)))}
                          </p>
                        </BidHighlight>
                      </div>

                      {leadingTeam && (
                        <div className="flex items-center gap-2 p-3 bg-cyan/10 rounded-xl border border-cyan/20">
                          <TrendingUp className="w-4 h-4 text-cyan" />
                          <span className="text-sm text-cyan font-medium">
                            Leading: {leadingTeam}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {isWaiting
                        ? "Auction has not started yet"
                        : isCompleted
                          ? "Auction has ended"
                          : "No player on auction right now"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isWaiting
                        ? "Check back soon!"
                        : "The host will put up the next player shortly."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bid Feed */}
            {bidFeed.length > 0 && (
              <div className="card-navy rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan" />
                  Live Bid Feed
                </h3>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {bidFeed.map((entry, i) => (
                      <div
                        key={entry.id}
                        data-ocid={`watch_bid_feed.item.${i + 1}`}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${
                          i === 0
                            ? "bg-cyan/10 border border-cyan/20"
                            : "bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {i === 0 && (
                            <TrendingUp className="w-3.5 h-3.5 text-cyan" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {entry.teamName}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-bold ${i === 0 ? "text-cyan" : "text-muted-foreground"}`}
                        >
                          {formatCurrency(BigInt(Math.round(entry.amount)))}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right: Teams */}
          <div className="space-y-4">
            {teams.length > 0 ? (
              <div className="card-navy rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-pink" />
                  Teams ({teams.length})
                </h3>
                <div className="space-y-3">
                  {teams.map((team, i) => {
                    const isLeading = team.teamId === engine?.highestBidTeamId;
                    const teamSpent =
                      engine?.results
                        .filter((r) => r.soldToTeamId === team.teamId)
                        .reduce((sum, r) => sum + r.amount, 0) ?? 0;
                    const totalBudget = team.budgetRemaining + teamSpent;
                    const budgetPct =
                      totalBudget > 0
                        ? Math.min(
                            100,
                            (team.budgetRemaining / totalBudget) * 100,
                          )
                        : 100;
                    return (
                      <div
                        key={team.teamId}
                        data-ocid={`watch_teams.item.${i + 1}`}
                        className={`p-3 rounded-xl border transition-all ${
                          isLeading
                            ? "bg-cyan/10 border-cyan/30"
                            : "bg-card/50 border-border/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-foreground truncate mr-2">
                            {team.teamName}
                            {isLeading && (
                              <span className="ml-1 text-xs text-cyan">🏏</span>
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {team.playersBought}P
                          </span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full gradient-cyan-pink"
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-cyan font-semibold">
                          &#8377;
                          {(team.budgetRemaining / 10_000_000).toFixed(1)} Cr
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Fallback: show player pool when no engine teams */
              <div className="card-navy rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-pink" />
                  Player Pool ({totalPlayers})
                </h3>
                {allPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No players added yet.
                  </p>
                ) : (
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {allPlayers.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                            currentPlayerData?.name === player.name
                              ? "bg-cyan/10 border border-cyan/20"
                              : "bg-secondary hover:bg-muted"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {player.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getRoleLabel(player.role)}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-cyan ml-2 flex-shrink-0">
                            {formatCurrency(
                              BigInt(Math.round(player.basePrice)),
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
