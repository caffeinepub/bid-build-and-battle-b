/**
 * SquadPage — shows a team's full squad at /squad/:teamId.
 * Visible to everyone (no login required).
 */

import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import React, { useState } from "react";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { useAuctionEngine } from "../hooks/useAuctionEngine";
import { formatCurrency } from "../utils/currencyFormatter";
import {
  getCategoryBadgeColor,
  getCategoryLabel,
  getRoleColor,
  getRoleLabel,
} from "../utils/playerHelpers";

type SortMode = "price" | "name" | "role";

export default function SquadPage() {
  const navigate = useNavigate();
  const { teamId } = useParams({ from: "/squad/$teamId" });
  const { engine, allPlayers } = useAuctionEngine();

  const [sortMode, setSortMode] = useState<SortMode>("price");

  // Find team in engine
  const engineTeam = engine?.teams.find((t) => t.teamId === teamId) ?? null;

  if (!engine || !engineTeam) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div
            data-ocid="squad_page.empty_state"
            className="text-center max-w-sm"
          >
            <Users className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h2 className="text-lg font-bold text-foreground mb-2">
              Team not found
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              The team you're looking for doesn't exist or the auction hasn't
              started.
            </p>
            <button
              type="button"
              data-ocid="squad_page.link"
              onClick={() => void navigate({ to: "/leaderboard" })}
              className="text-sm text-cyan hover:underline"
            >
              ← Back to Leaderboard
            </button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Compute squad details from engine results
  const myResults = engine.results.filter((r) => r.soldToTeamId === teamId);
  const totalSpent = myResults.reduce((s, r) => s + r.amount, 0);
  const budgetUsed = totalSpent;
  const avgPrice = myResults.length > 0 ? totalSpent / myResults.length : 0;

  // Build detailed squad list
  const squadEntries = engineTeam.squad
    .map((pid) => {
      const player = allPlayers.find((p) => p.id === pid);
      const result = myResults.find((r) => r.playerId === pid);
      return player ? { player, pricePaid: result?.amount ?? 0 } : null;
    })
    .filter(
      (e): e is { player: (typeof allPlayers)[0]; pricePaid: number } =>
        e !== null,
    );

  // Sort
  const sorted = [...squadEntries].sort((a, b) => {
    if (sortMode === "price") return b.pricePaid - a.pricePaid;
    if (sortMode === "name") return a.player.name.localeCompare(b.player.name);
    if (sortMode === "role") return a.player.role.localeCompare(b.player.role);
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          type="button"
          data-ocid="squad_page.link"
          onClick={() => void navigate({ to: "/leaderboard" })}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </button>

        {/* Team Header */}
        <div
          data-ocid="squad_page.card"
          className="card-navy rounded-2xl p-6 border border-cyan/20 mb-6"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.14 0.04 255) 0%, oklch(0.12 0.03 240) 100%)",
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-2xl shrink-0">
              🏏
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-foreground truncate">
                {engineTeam.teamName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Squad</p>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-card/60 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground">Players</p>
                  <p className="text-lg font-bold text-cyan">
                    {engineTeam.playersBought}
                  </p>
                </div>
                <div className="bg-card/60 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground">Budget Used</p>
                  <p className="text-sm font-bold text-pink">
                    {budgetUsed > 0
                      ? formatCurrency(BigInt(Math.round(budgetUsed)))
                      : "—"}
                  </p>
                </div>
                <div className="bg-card/60 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm font-bold text-cyan">
                    {formatCurrency(
                      BigInt(Math.round(engineTeam.budgetRemaining)),
                    )}
                  </p>
                </div>
                <div className="bg-card/60 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                  <p className="text-sm font-bold text-foreground">
                    {avgPrice > 0
                      ? formatCurrency(BigInt(Math.round(avgPrice)))
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium">
            Sort by:
          </span>
          {(["price", "name", "role"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              data-ocid={`squad_page.${mode}.tab`}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${
                sortMode === mode
                  ? "bg-cyan/20 border-cyan text-cyan"
                  : "bg-muted/30 border-border/50 text-muted-foreground hover:border-cyan/30"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Squad Table */}
        {sorted.length === 0 ? (
          <div
            data-ocid="squad_page.empty_state"
            className="text-center py-16 card-navy rounded-2xl border border-border"
          >
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">
              No players acquired yet.
            </p>
          </div>
        ) : (
          <div
            data-ocid="squad_page.table"
            className="overflow-x-auto rounded-2xl border border-border card-navy"
          >
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["#", "Player", "Role", "Category", "Price Paid"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map(({ player, pricePaid }, i) => (
                  <tr
                    key={player.id}
                    data-ocid={`squad_page.item.${i + 1}`}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-sm text-muted-foreground w-10">
                      {i + 1}
                    </td>
                    {/* Player */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-navy-mid border border-border flex-shrink-0">
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base opacity-30">
                              🏏
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {player.name}
                          </p>
                          {player.country && (
                            <p className="text-xs text-muted-foreground">
                              🌍 {player.country}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs border-0 ${getRoleColor(player.role)}`}
                      >
                        {getRoleLabel(player.role)}
                      </Badge>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs ${getCategoryBadgeColor(player.category)}`}
                      >
                        {getCategoryLabel(player.category)}
                      </Badge>
                    </td>
                    {/* Price */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-cyan">
                        {pricePaid > 0
                          ? formatCurrency(BigInt(Math.round(pricePaid)))
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
