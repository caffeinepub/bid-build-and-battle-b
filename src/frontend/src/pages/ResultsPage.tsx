import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Crown,
  Download,
  FileSpreadsheet,
  Medal,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { Team } from "../backend";
import { TeamStatus } from "../backend";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import SkeletonLoader from "../components/SkeletonLoader";
import { useGetTeams } from "../hooks/useQueries";
import type { LocalPlayer } from "../lib/auctionStore";
import { getAuctionEngine, getLocalPlayers } from "../lib/auctionStore";
import {
  formatCurrency,
  getCategoryBadgeColor,
  getCategoryLabel,
  getRoleColor,
  getRoleLabel,
  getTeamStatusColor,
} from "../utils/playerHelpers";

// ─── Player Thumb ─────────────────────────────────────────────────────────────
function PlayerThumb({ player }: { player: LocalPlayer }) {
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-navy-mid border border-border flex-shrink-0">
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
        <div className="w-full h-full flex items-center justify-center text-lg opacity-30">
          🏏
        </div>
      )}
    </div>
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────
function exportToCSV(teams: Team[], players: LocalPlayer[]) {
  const rows: string[] = [
    "Team Name,Owner,Player Name,Role,Category,Base Price",
  ];

  for (const team of teams) {
    if (team.status !== TeamStatus.approved) continue;
    rows.push(`${team.name},${team.owner},—,—,—,—`);
  }

  rows.push("");
  rows.push("Player Pool");
  rows.push("ID,Name,Role,Category,Base Price");
  for (const player of players) {
    rows.push(
      `${player.id},${player.name},${getRoleLabel(player.role)},${getCategoryLabel(player.category)},${player.basePrice}`,
    );
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "b3-auction-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(teams: Team[], players: LocalPlayer[]) {
  const engine = getAuctionEngine();
  const data = {
    exportedAt: new Date().toISOString(),
    teams: teams.map((t) => ({
      name: t.name,
      owner: t.owner,
      email: t.email,
      status: t.status,
    })),
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      role: getRoleLabel(p.role),
      category: getCategoryLabel(p.category),
      basePrice: p.basePrice,
      status: p.status,
    })),
    results: engine?.results ?? [],
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "b3-auction-results.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Summary Stats ────────────────────────────────────────────────────────────
function SummaryStats({
  teams,
  players,
}: {
  teams: Team[];
  players: LocalPlayer[];
}) {
  const approvedTeams = teams.filter((t) => t.status === TeamStatus.approved);
  const totalPlayers = players.length;

  const engine = getAuctionEngine();
  const results = engine?.results ?? [];

  // Most expensive player from auction results
  const mostExpensiveResult = results.reduce<{
    playerName: string;
    amount: number;
  } | null>((acc, r) => {
    if (!acc || r.amount > acc.amount)
      return { playerName: r.playerName, amount: r.amount };
    return acc;
  }, null);

  // Fallback: highest base price player if no results
  const mostExpensiveBase = players.reduce<{
    name: string;
    price: number;
  } | null>((acc, p) => {
    if (!acc || p.basePrice > acc.price)
      return { name: p.name, price: p.basePrice };
    return acc;
  }, null);

  const stats = [
    {
      icon: Users,
      label: "Registered Teams",
      value: teams.length.toString(),
      color: "text-cyan",
    },
    {
      icon: Medal,
      label: "Approved Teams",
      value: approvedTeams.length.toString(),
      color: "text-chart-3",
    },
    {
      icon: Trophy,
      label: "Total Players",
      value: totalPlayers.toString(),
      color: "text-pink",
    },
    {
      icon: Star,
      label: mostExpensiveResult ? "Most Expensive" : "Highest Base Price",
      value: mostExpensiveResult
        ? formatCurrency(BigInt(Math.round(mostExpensiveResult.amount)))
        : mostExpensiveBase
          ? formatCurrency(BigInt(Math.round(mostExpensiveBase.price)))
          : "—",
      sub: mostExpensiveResult
        ? mostExpensiveResult.playerName
        : mostExpensiveBase?.name,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {stats.map(({ icon: Icon, label, value, color, sub }) => (
        <div
          key={label}
          className="card-navy rounded-xl p-4 border border-border text-center"
        >
          <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              {sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────
function TeamsTab({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-16 card-navy rounded-xl">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No teams registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team, i) => (
        <div
          key={team.name}
          className="card-navy rounded-xl p-5 border border-border hover:border-cyan/20 transition-colors"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  i === 0
                    ? "gradient-cyan-pink text-white"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{team.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {team.owner} · {team.email}
                </p>
              </div>
            </div>
            <Badge
              className={`text-xs border-0 ${getTeamStatusColor(team.status)}`}
            >
              {team.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────
function PlayersTab({ players }: { players: LocalPlayer[] }) {
  const [filter, setFilter] = useState<string>("all");

  const roles = ["all", "batsman", "bowler", "allRounder", "wicketKeeper"];

  const filtered =
    filter === "all" ? players : players.filter((p) => p.role === filter);

  if (players.length === 0) {
    return (
      <div className="text-center py-16 card-navy rounded-xl">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No players in the pool yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role Filter */}
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            type="button"
            key={role}
            onClick={() => setFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === role
                ? "bg-cyan/20 text-cyan border border-cyan/30"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {role === "all" ? "All Players" : getRoleLabel(role)}
          </button>
        ))}
      </div>

      {/* Player List */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["Player", "Role", "Category", "Base Price", "Status"].map(
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
            {filtered.map((player) => (
              <tr
                key={player.id}
                className="hover:bg-secondary/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerThumb player={player} />
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {player.name}
                      </p>
                      {player.stats && (
                        <p className="text-xs text-muted-foreground">
                          {player.stats}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`text-xs border-0 ${getRoleColor(player.role)}`}
                  >
                    {getRoleLabel(player.role)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`text-xs ${getCategoryBadgeColor(player.category)}`}
                  >
                    {getCategoryLabel(player.category)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-cyan">
                    {formatCurrency(BigInt(Math.round(player.basePrice)))}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      player.status === "sold"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : player.status === "unsold"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {player.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Auction Results Tab ──────────────────────────────────────────────────────
function AuctionResultsTab() {
  const engine = getAuctionEngine();
  const results = engine?.results ?? [];

  if (results.length === 0) {
    return (
      <div className="text-center py-16 card-navy rounded-xl">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No auction results yet.</p>
      </div>
    );
  }

  const totalValue = results.reduce((sum, r) => sum + r.amount, 0);

  // Group by team
  const teamMap = new Map<
    string,
    { teamName: string; players: typeof results; totalSpent: number }
  >();
  for (const r of results) {
    const existing = teamMap.get(r.soldToTeamId);
    if (existing) {
      existing.players.push(r);
      existing.totalSpent += r.amount;
    } else {
      teamMap.set(r.soldToTeamId, {
        teamName: r.soldToTeamName,
        players: [r],
        totalSpent: r.amount,
      });
    }
  }

  const teamEntries = Array.from(teamMap.entries()).sort(
    (a, b) => b[1].totalSpent - a[1].totalSpent,
  );

  // Per-team budget remaining
  const engineTeams = engine?.teams ?? [];

  return (
    <div className="space-y-4">
      {/* Total Summary */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan/5 border border-cyan/20">
        <TrendingUp className="w-4 h-4 text-cyan" />
        <span className="text-sm text-cyan font-medium">
          Total auction value: {formatCurrency(BigInt(Math.round(totalValue)))}{" "}
          · {results.length} players sold
        </span>
      </div>

      {/* Per-Team Breakdown */}
      <div className="space-y-4">
        {teamEntries.map(([teamId, teamData], ti) => {
          const engineTeam = engineTeams.find((t) => t.teamId === teamId);
          const remaining = engineTeam?.budgetRemaining ?? null;
          return (
            <div
              key={teamId}
              data-ocid={`results.item.${ti + 1}`}
              className="card-navy rounded-xl border border-border overflow-hidden"
            >
              {/* Team Header */}
              <div className="flex items-center justify-between p-4 bg-cyan/5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan/20 flex items-center justify-center font-bold text-cyan text-sm">
                    {ti + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      {teamData.teamName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {teamData.players.length} players ·{" "}
                      <span className="text-pink font-medium">
                        {formatCurrency(
                          BigInt(Math.round(teamData.totalSpent)),
                        )}{" "}
                        spent
                      </span>
                      {remaining !== null && (
                        <span className="ml-2 text-cyan">
                          · {formatCurrency(BigInt(Math.round(remaining)))}{" "}
                          remaining
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Player List */}
              <div className="p-3 space-y-1.5">
                {teamData.players.map((result) => (
                  <div
                    key={`${result.playerId}-${result.timestamp}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20"
                  >
                    <p className="text-sm text-foreground truncate mr-2">
                      {result.playerName}
                    </p>
                    <span className="text-sm font-bold text-cyan shrink-0">
                      {formatCurrency(BigInt(Math.round(result.amount)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* All results flat list */}
      <details className="mt-2">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          View all {results.length} bids (flat list)
        </summary>
        <div className="space-y-2 mt-2">
          {results.map((result) => (
            <div
              key={`flat-${result.playerId}-${result.timestamp}`}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
            >
              <div>
                <p className="font-medium text-sm text-foreground">
                  {result.playerName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  → <span className="text-cyan">{result.soldToTeamName}</span>
                </p>
              </div>
              <span className="text-sm font-bold text-pink">
                {formatCurrency(BigInt(Math.round(result.amount)))}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function ResultsPage() {
  const players = getLocalPlayers();
  const { data: teams, isLoading: teamsLoading } = useGetTeams();

  const handleExportCSV = () => {
    exportToCSV(teams ?? [], players);
    toast.success("CSV exported successfully!");
  };

  const handleExportJSON = () => {
    exportToJSON(teams ?? [], players);
    toast.success("JSON exported successfully!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 mb-3">
              <BarChart3 className="w-4 h-4 text-cyan" />
              <span className="text-sm font-medium text-cyan">
                Auction Results
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gradient">
              Results & Stats
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live auction data — updates in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              JSON
            </Button>
          </div>
        </div>

        {teamsLoading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : (
          <>
            <SummaryStats teams={teams ?? []} players={players} />

            <Tabs defaultValue="teams">
              <TabsList className="mb-6">
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teams ({teams?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  Players ({players.length})
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Auction Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teams">
                <TeamsTab teams={teams ?? []} />
              </TabsContent>
              <TabsContent value="players">
                <PlayersTab players={players} />
              </TabsContent>
              <TabsContent value="results">
                <AuctionResultsTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
