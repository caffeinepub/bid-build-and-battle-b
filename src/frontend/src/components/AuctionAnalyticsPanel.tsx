/**
 * AuctionAnalyticsPanel — real-time auction statistics.
 * variant="admin" → full panel with team spending table + unsold/remaining counts
 * variant="basic" → 3-stat summary (most expensive, total spend, avg price)
 */

import { BarChart2, TrendingUp, Trophy, Users } from "lucide-react";
import React from "react";
import type { AuctionEngine, LocalPlayer } from "../lib/auctionStore";
import { formatCurrency } from "../utils/currencyFormatter";

interface AuctionAnalyticsPanelProps {
  engine: AuctionEngine | null;
  allPlayers: LocalPlayer[];
  variant: "admin" | "basic";
}

export default function AuctionAnalyticsPanel({
  engine,
  allPlayers,
  variant,
}: AuctionAnalyticsPanelProps) {
  if (!engine) return null;

  const results = engine.results ?? [];
  const teams = engine.teams ?? [];

  // ── Core stats ──────────────────────────────────────────────────────────────

  const soldCount = results.length;
  const totalSpend = results.reduce((sum, r) => sum + r.amount, 0);
  const avgPrice = soldCount > 0 ? Math.round(totalSpend / soldCount) : 0;

  // Most expensive player
  const mostExpensiveResult =
    results.length > 0
      ? results.reduce(
          (best, r) => (r.amount > best.amount ? r : best),
          results[0],
        )
      : null;

  // ── Admin-only stats ─────────────────────────────────────────────────────────
  const unsoldCount = allPlayers.filter((p) => p.status === "unsold").length;
  const remainingCount = engine.playerQueue.length;

  // Team spending — sorted by totalSpent descending
  const teamSpending = teams
    .map((team) => {
      const spent = results
        .filter((r) => r.soldToTeamId === team.teamId)
        .reduce((sum, r) => sum + r.amount, 0);
      const totalBudget = team.budgetRemaining + spent;
      const pct =
        totalBudget > 0 ? Math.min(100, (spent / totalBudget) * 100) : 0;
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        playersBought: team.playersBought,
        spent,
        remaining: team.budgetRemaining,
        totalBudget,
        pct,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return (
    <div
      data-ocid="analytics.panel"
      className="card-navy rounded-2xl p-4 border border-border space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-cyan" />
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {variant === "admin" ? "Auction Analytics" : "Live Stats"}
        </h3>
        {variant === "basic" && (
          <span className="ml-auto text-xs text-muted-foreground/60 font-normal">
            Live
          </span>
        )}
      </div>

      {/* ── Core 3 stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3">
        {/* Most Expensive Player */}
        <div className="rounded-xl p-3 bg-gradient-to-br from-gold/10 to-transparent border border-gold/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs text-gold/80 font-semibold uppercase tracking-wider">
              Most Expensive
            </span>
          </div>
          {mostExpensiveResult ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">
                {mostExpensiveResult.playerName}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate mr-2">
                  → {mostExpensiveResult.soldToTeamName}
                </p>
                <p className="text-sm font-extrabold text-gold shrink-0">
                  {formatCurrency(
                    BigInt(Math.round(mostExpensiveResult.amount)),
                  )}
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No sales yet</p>
          )}
        </div>

        {/* Total Spend */}
        <div className="rounded-xl p-3 bg-cyan/5 border border-cyan/15">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan" />
            <span className="text-xs text-cyan/80 font-semibold uppercase tracking-wider">
              Total Spend
            </span>
          </div>
          <p className="text-2xl font-extrabold text-cyan leading-none">
            {totalSpend > 0
              ? formatCurrency(BigInt(Math.round(totalSpend)))
              : "₹0"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {soldCount} player{soldCount !== 1 ? "s" : ""} sold
          </p>
        </div>

        {/* Average Price */}
        <div className="rounded-xl p-3 bg-pink/5 border border-pink/15">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart2 className="w-3.5 h-3.5 text-pink" />
            <span className="text-xs text-pink/80 font-semibold uppercase tracking-wider">
              Avg Price
            </span>
          </div>
          <p className="text-2xl font-extrabold text-pink leading-none">
            {avgPrice > 0 ? formatCurrency(BigInt(Math.round(avgPrice))) : "₹0"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">per player</p>
        </div>
      </div>

      {/* ── Admin-only extended stats ────────────────────────────────────────── */}
      {variant === "admin" && (
        <>
          {/* Unsold + Remaining row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5 bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                Unsold
              </p>
              <p className="text-xl font-bold text-muted-foreground">
                {unsoldCount}
              </p>
            </div>
            <div className="rounded-lg p-2.5 bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                Remaining
              </p>
              <p className="text-xl font-bold text-cyan">{remainingCount}</p>
            </div>
          </div>

          {/* Team Spending Table */}
          {teamSpending.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-pink" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Team Spending
                </span>
              </div>
              <div className="space-y-2">
                {teamSpending.map((team, i) => (
                  <div
                    key={team.teamId}
                    data-ocid={`analytics.team.item.${i + 1}`}
                    className="rounded-lg p-2.5 bg-card/50 border border-border/40"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-foreground truncate mr-2">
                        {i === 0 && team.spent > 0 && (
                          <span className="text-gold mr-1">🏆</span>
                        )}
                        {team.teamName}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {team.playersBought}P
                        </span>
                        <span className="text-xs font-bold text-cyan">
                          {team.spent > 0
                            ? formatCurrency(BigInt(Math.round(team.spent)))
                            : "₹0"}
                        </span>
                      </div>
                    </div>
                    {/* Budget bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-cyan-pink transition-all duration-500"
                        style={{
                          width: `${team.pct}%`,
                          opacity: team.pct > 0 ? 1 : 0.3,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground/60">
                        Spent: {Math.round(team.pct)}%
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        Left:{" "}
                        {formatCurrency(BigInt(Math.round(team.remaining)))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
