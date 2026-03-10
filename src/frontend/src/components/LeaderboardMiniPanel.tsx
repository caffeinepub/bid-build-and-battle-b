/**
 * LeaderboardMiniPanel — compact top-5 leaderboard shown inside Auction Room,
 * Team Dashboard, and Watch Page. Has an optional link to /leaderboard.
 */

import { useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import React from "react";
import type { AuctionEngine, LocalPlayer } from "../lib/auctionStore";
import { formatCurrency } from "../utils/currencyFormatter";

interface LeaderboardMiniPanelProps {
  engine: AuctionEngine | null;
  allPlayers: LocalPlayer[];
  showLink?: boolean;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const ROW_HIGHLIGHT = [
  "bg-[oklch(0.82_0.18_85/0.08)] border-[oklch(0.82_0.18_85/0.25)]",
  "bg-[oklch(0.70_0.05_255/0.06)] border-[oklch(0.60_0.05_255/0.20)]",
  "bg-[oklch(0.55_0.10_35/0.06)] border-[oklch(0.55_0.10_35/0.20)]",
];

export default function LeaderboardMiniPanel({
  engine,
  allPlayers: _allPlayers,
  showLink = false,
}: LeaderboardMiniPanelProps) {
  const navigate = useNavigate();

  if (!engine || engine.teams.length === 0) {
    return (
      <div
        data-ocid="leaderboard_mini.panel"
        className="card-navy rounded-2xl p-4 border border-border/50"
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-gold" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Leaderboard (Top 5)
          </h3>
        </div>
        <p
          data-ocid="leaderboard_mini.empty_state"
          className="text-xs text-muted-foreground text-center py-4"
        >
          Auction not started
        </p>
      </div>
    );
  }

  // Compute per-team totals
  const teamRows = engine.teams
    .map((team) => {
      const totalSpent = engine.results
        .filter((r) => r.soldToTeamId === team.teamId)
        .reduce((s, r) => s + r.amount, 0);
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        playersBought: team.playersBought,
        totalSpent,
        budgetRemaining: team.budgetRemaining,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return (
    <div
      data-ocid="leaderboard_mini.panel"
      className="card-navy rounded-2xl p-4 border border-border/50 space-y-2"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Leaderboard (Top 5)
          </h3>
        </div>
      </div>

      <div className="space-y-1.5">
        {teamRows.map((row, i) => (
          <div
            key={row.teamId}
            data-ocid={`leaderboard_mini.item.${i + 1}`}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              i < 3 ? ROW_HIGHLIGHT[i] : "bg-card/50 border-border/30"
            }`}
          >
            <span className="text-base leading-none w-5 shrink-0 text-center">
              {i < 3 ? RANK_MEDALS[i] : `${i + 1}.`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {row.teamName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {row.playersBought} players
              </p>
            </div>
            <span
              className={`text-xs font-bold shrink-0 ${
                i === 0
                  ? "text-gold"
                  : i === 1
                    ? "text-muted-foreground"
                    : "text-cyan"
              }`}
            >
              {row.totalSpent > 0
                ? formatCurrency(BigInt(Math.round(row.totalSpent)))
                : "₹0"}
            </span>
          </div>
        ))}
      </div>

      {showLink && (
        <button
          type="button"
          data-ocid="leaderboard_mini.link"
          onClick={() => void navigate({ to: "/leaderboard" })}
          className="w-full text-xs text-cyan hover:text-cyan/80 font-medium pt-1 transition-colors text-right"
        >
          View Full Leaderboard →
        </button>
      )}
    </div>
  );
}
