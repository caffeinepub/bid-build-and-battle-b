import React, { useState } from 'react';
import { useGetPlayers, useGetTeams, useCurrentAuctionState, AuctionStatus, PlayerRole } from '../hooks/useQueries';
import {
  Trophy, BarChart3, Users, TrendingUp, Star, Download, FileSpreadsheet,
  Medal, Crown, Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SkeletonLoader from '../components/SkeletonLoader';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import {
  formatCurrency,
  getRoleLabel,
  getCategoryLabel,
  getRoleColor,
  getCategoryBadgeColor,
  getTeamStatusColor,
} from '../lib/utils';
import type { Player, Team } from '../backend';
import { TeamStatus } from '../backend';
import { toast } from 'sonner';

// ─── Player Photo ─────────────────────────────────────────────────────────────
function PlayerThumb({ player }: { player: Player }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  React.useEffect(() => {
    let url: string | null = null;
    const load = async () => {
      try {
        const direct = player.photo.getDirectURL();
        if (direct) { setPhotoUrl(direct); return; }
        const bytes = await player.photo.getBytes();
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      } catch { setPhotoUrl(null); }
    };
    load();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [player.photo]);

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-navy-mid border border-border flex-shrink-0">
      {photoUrl ? (
        <img src={photoUrl} alt={player.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg opacity-30">🏏</div>
      )}
    </div>
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────
function exportToCSV(teams: Team[], players: Array<[bigint, Player]>) {
  const rows: string[] = ['Team Name,Owner,Player Name,Role,Category,Base Price'];

  for (const team of teams) {
    if (team.status !== TeamStatus.approved) continue;
    // In a real app, players would be linked to teams via backend
    rows.push(`${team.name},${team.owner},—,—,—,—`);
  }

  // All players summary
  rows.push('');
  rows.push('Player Pool');
  rows.push('ID,Name,Role,Category,Base Price');
  for (const [id, player] of players) {
    rows.push(`${id},${player.name},${getRoleLabel(player.role)},${getCategoryLabel(player.category)},${Number(player.basePrice)}`);
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'b3-auction-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(teams: Team[], players: Array<[bigint, Player]>) {
  const data = {
    exportedAt: new Date().toISOString(),
    teams: teams.map((t) => ({
      name: t.name,
      owner: t.owner,
      email: t.email,
      status: t.status,
    })),
    players: players.map(([id, p]) => ({
      id: id.toString(),
      name: p.name,
      role: getRoleLabel(p.role),
      category: getCategoryLabel(p.category),
      basePrice: Number(p.basePrice),
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'b3-auction-results.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Summary Stats ────────────────────────────────────────────────────────────
function SummaryStats({
  teams,
  players,
}: {
  teams: Team[];
  players: Array<[bigint, Player]>;
}) {
  const approvedTeams = teams.filter((t) => t.status === TeamStatus.approved);
  const totalPlayers = players.length;

  const mostExpensive = players.reduce<{ name: string; price: bigint } | null>((acc, [, p]) => {
    if (!acc || p.basePrice > acc.price) return { name: p.name, price: p.basePrice };
    return acc;
  }, null);

  const roleBreakdown: Record<string, number> = {};
  for (const [, p] of players) {
    const label = getRoleLabel(p.role);
    roleBreakdown[label] = (roleBreakdown[label] ?? 0) + 1;
  }

  const stats = [
    { icon: Users, label: 'Registered Teams', value: teams.length.toString(), color: 'text-cyan' },
    { icon: Medal, label: 'Approved Teams', value: approvedTeams.length.toString(), color: 'text-chart-3' },
    { icon: Trophy, label: 'Total Players', value: totalPlayers.toString(), color: 'text-pink' },
    {
      icon: Star,
      label: 'Highest Base Price',
      value: mostExpensive ? formatCurrency(mostExpensive.price) : '—',
      color: 'text-chart-4',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="card-navy rounded-xl p-4 border border-border text-center">
          <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                i === 0 ? 'gradient-cyan-pink text-white' : 'bg-secondary text-muted-foreground'
              }`}>
                {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{team.name}</h3>
                <p className="text-xs text-muted-foreground">{team.owner} · {team.email}</p>
              </div>
            </div>
            <Badge className={`text-xs border-0 ${getTeamStatusColor(team.status)}`}>
              {team.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────
function PlayersTab({ players }: { players: Array<[bigint, Player]> }) {
  const [filter, setFilter] = useState<string>('all');

  const roles = ['all', ...Object.values(PlayerRole)];

  const filtered = filter === 'all'
    ? players
    : players.filter(([, p]) => p.role === filter);

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
            key={role}
            onClick={() => setFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === role
                ? 'bg-cyan/20 text-cyan border border-cyan/30'
                : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {role === 'all' ? 'All Players' : getRoleLabel(role as PlayerRole)}
          </button>
        ))}
      </div>

      {/* Player List */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {['Player', 'Role', 'Category', 'Base Price'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(([id, player]) => (
              <tr key={id.toString()} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerThumb player={player} />
                    <div>
                      <p className="font-medium text-foreground text-sm">{player.name}</p>
                      {player.stats && (
                        <p className="text-xs text-muted-foreground">{player.stats}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${getRoleColor(player.role)}`}>
                    {getRoleLabel(player.role)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${getCategoryBadgeColor(player.category)}`}>
                    {getCategoryLabel(player.category)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-cyan">{formatCurrency(player.basePrice)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { data: teams, isLoading: teamsLoading } = useGetTeams();
  const { data: auctionState } = useCurrentAuctionState();

  const isLoading = playersLoading || teamsLoading;
  const isCompleted = auctionState === AuctionStatus.completed;

  const handleExportCSV = () => {
    if (!teams || !players) return;
    exportToCSV(teams, players);
    toast.success('CSV exported successfully!');
  };

  const handleExportJSON = () => {
    if (!teams || !players) return;
    exportToJSON(teams, players);
    toast.success('JSON exported successfully!');
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
              <span className="text-xs font-medium text-cyan">Auction Results</span>
            </div>
            <h1 className="text-3xl font-bold text-gradient">Results & Statistics</h1>
            <p className="text-muted-foreground mt-1">
              {isCompleted
                ? 'The auction has concluded. Here are the final results.'
                : 'Live auction data — results will be finalized when the auction ends.'}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || !teams || !players}
              variant="outline"
              size="sm"
              className="border-cyan/30 text-cyan hover:bg-cyan/10 gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportJSON}
              disabled={isLoading || !teams || !players}
              variant="outline"
              size="sm"
              className="border-pink/30 text-pink hover:bg-pink/10 gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Auction Status */}
        {!isCompleted && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
            auctionState === AuctionStatus.live
              ? 'bg-chart-3/10 border-chart-3/20'
              : 'bg-secondary border-border'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              auctionState === AuctionStatus.live ? 'bg-chart-3 animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span className="text-sm font-medium text-foreground">
              {auctionState === AuctionStatus.live
                ? '🔴 Auction is currently LIVE — results will update in real time'
                : auctionState === AuctionStatus.paused
                ? '⏸ Auction is paused'
                : '⏳ Auction has not started yet'}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-navy rounded-xl p-4 border border-border">
                  <SkeletonLoader variant="text" count={2} />
                </div>
              ))}
            </div>
            <SkeletonLoader variant="table-row" count={5} />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <SummaryStats teams={teams ?? []} players={players ?? []} />

            {/* Tabs */}
            <Tabs defaultValue="teams">
              <TabsList className="bg-secondary border border-border mb-6">
                <TabsTrigger
                  value="teams"
                  className="data-[state=active]:bg-cyan/20 data-[state=active]:text-cyan"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Teams ({teams?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="data-[state=active]:bg-cyan/20 data-[state=active]:text-cyan"
                >
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Players ({players?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teams">
                <TeamsTab teams={teams ?? []} />
              </TabsContent>

              <TabsContent value="players">
                <PlayersTab players={players ?? []} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
