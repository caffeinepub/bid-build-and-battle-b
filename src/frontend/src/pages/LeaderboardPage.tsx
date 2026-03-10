/**
 * LeaderboardPage — full leaderboard at /leaderboard.
 * Visible to everyone (no login required).
 * Shows team rankings + auction summary section.
 */

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import React from "react";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { useAuctionEngine } from "../hooks/useAuctionEngine";
import { formatCurrency } from "../utils/currencyFormatter";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const TOP3_ROW_STYLES = [
  // Gold
  "bg-[oklch(0.82_0.18_85/0.10)] border-[oklch(0.82_0.18_85/0.35)] shadow-[0_0_12px_oklch(0.82_0.18_85/0.15)]",
  // Silver
  "bg-[oklch(0.70_0.05_255/0.08)] border-[oklch(0.60_0.05_255/0.25)]",
  // Bronze
  "bg-[oklch(0.55_0.10_35/0.08)] border-[oklch(0.55_0.10_35/0.25)]",
];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { engine, allPlayers: _allPlayers } = useAuctionEngine();

  const teamRows = (engine?.teams ?? [])
    .map((team) => {
      const totalSpent = (engine?.results ?? [])
        .filter((r) => r.soldToTeamId === team.teamId)
        .reduce((s, r) => s + r.amount, 0);
      const avgPlayerPrice =
        team.playersBought > 0 ? totalSpent / team.playersBought : 0;
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        playersBought: team.playersBought,
        totalSpent,
        budgetLeft: team.budgetRemaining,
        avgPlayerPrice,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Auction summary
  const results = engine?.results ?? [];
  const totalSold = results.length;
  const totalPlayers = _allPlayers.length;
  const totalUnsold = totalPlayers - totalSold;
  const totalAuctionValue = results.reduce((s, r) => s + r.amount, 0);
  const mostExpensive = results.reduce<(typeof results)[0] | null>(
    (acc, r) => (!acc || r.amount > acc.amount ? r : acc),
    null,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            data-ocid="leaderboard.link"
            onClick={() => void navigate({ to: "/watch" })}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-gold" />
              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.78 0.18 195))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Auction Leaderboard
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live standings — sorted by total spend
            </p>
          </div>
        </div>

        {/* Leaderboard Table */}
        {teamRows.length === 0 ? (
          <div
            data-ocid="leaderboard.empty_state"
            className="text-center py-20 card-navy rounded-2xl border border-border"
          >
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">
              No teams yet — auction hasn't started.
            </p>
          </div>
        ) : (
          <div data-ocid="leaderboard.table" className="space-y-3 mb-10">
            {teamRows.map((row, i) => (
              <div
                key={row.teamId}
                data-ocid={`leaderboard.item.${i + 1}`}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all ${
                  i < 3
                    ? TOP3_ROW_STYLES[i]
                    : "card-navy border-border/50 hover:border-cyan/20"
                }`}
              >
                {/* Rank */}
                <div className="flex items-center gap-3 sm:w-12 shrink-0">
                  <span className="text-2xl leading-none">
                    {i < 3 ? (
                      RANK_MEDALS[i]
                    ) : (
                      <span className="text-base font-bold text-muted-foreground w-8 text-center inline-block">
                        {i + 1}
                      </span>
                    )}
                  </span>
                </div>

                {/* Team Name */}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    data-ocid={`leaderboard.squad_link.${i + 1}`}
                    onClick={() =>
                      void navigate({
                        to: "/squad/$teamId",
                        params: { teamId: row.teamId },
                      })
                    }
                    className={`font-bold text-base text-left hover:underline transition-colors truncate block ${
                      i === 0
                        ? "text-gold"
                        : i === 1
                          ? "text-muted-foreground"
                          : "text-foreground"
                    }`}
                  >
                    {row.teamName}
                  </button>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {row.playersBought} players bought
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 text-right">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-sm font-bold text-pink">
                      {row.totalSpent > 0
                        ? formatCurrency(BigInt(Math.round(row.totalSpent)))
                        : "—"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Budget Left</p>
                    <p className="text-sm font-bold text-cyan">
                      {formatCurrency(BigInt(Math.round(row.budgetLeft)))}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Avg Price</p>
                    <p className="text-sm font-bold text-foreground">
                      {row.avgPlayerPrice > 0
                        ? formatCurrency(BigInt(Math.round(row.avgPlayerPrice)))
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auction Summary Section */}
        {(results.length > 0 || totalPlayers > 0) && (
          <section
            data-ocid="leaderboard.section"
            className="card-navy rounded-2xl p-6 border border-border/50 space-y-4"
          >
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan" />
              Auction Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-card/50 rounded-xl border border-border/30">
                <p className="text-2xl font-extrabold text-cyan">{totalSold}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Players Sold
                </p>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-xl border border-border/30">
                <p className="text-2xl font-extrabold text-muted-foreground">
                  {totalUnsold < 0 ? 0 : totalUnsold}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unsold</p>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-xl border border-border/30">
                <p className="text-xl font-extrabold text-pink">
                  {totalAuctionValue > 0
                    ? formatCurrency(BigInt(Math.round(totalAuctionValue)))
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Auction Value
                </p>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-xl border border-border/30">
                <p
                  className="text-sm font-extrabold text-gold truncate"
                  title={mostExpensive?.playerName}
                >
                  {mostExpensive ? mostExpensive.playerName : "—"}
                </p>
                {mostExpensive && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(BigInt(Math.round(mostExpensive.amount)))}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Most Expensive
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
