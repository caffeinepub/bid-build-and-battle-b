import React, { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetPlayers,
  useAddPlayer,
  useDeletePlayer,
  useGetTeams,
  useApproveTeam,
  useRejectTeam,
  useApproveAllTeams,
  useRejectAllTeams,
  useUpdateAuctionState,
  useUpdateCurrentPlayer,
  useUpdatePlayerState,
  useCreateAuction,
  useListApprovals,
  useSetApproval,
  useIsAdmin,
  PlayerRole,
  PlayerCategory,
  AuctionStatus,
} from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Trash2,
  Users,
  Trophy,
  Settings,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Gavel,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Add Player Form ──────────────────────────────────────────────────────────

function AddPlayerForm() {
  const { actor, isFetching: actorFetching } = useActor();
  const addPlayer = useAddPlayer();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>(PlayerRole.batsman);
  const [category, setCategory] = useState<PlayerCategory>(PlayerCategory.cappedIndian);
  const [basePrice, setBasePrice] = useState('');
  const [stats, setStats] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Player name is required');
      return;
    }
    if (!basePrice || isNaN(Number(basePrice)) || Number(basePrice) <= 0) {
      setFormError('Valid base price is required');
      return;
    }
    if (!actor) {
      setFormError('Not connected to backend. Please refresh and try again.');
      return;
    }

    let photo: ExternalBlob;
    try {
      if (photoFile) {
        const bytes = new Uint8Array(await photoFile.arrayBuffer());
        photo = ExternalBlob.fromBytes(bytes);
      } else if (photoUrl.trim()) {
        photo = ExternalBlob.fromURL(photoUrl.trim());
      } else {
        photo = ExternalBlob.fromURL('https://placehold.co/200x200/1a1a2e/cyan?text=Player');
      }
    } catch {
      setFormError('Failed to process photo. Please try a different image.');
      return;
    }

    try {
      await addPlayer.mutateAsync({
        name: name.trim(),
        role,
        category,
        basePrice: BigInt(Math.round(Number(basePrice) * 100000)),
        stats: stats.trim() || null,
        photo,
        isDeletable: true,
      });
      toast.success(`Player "${name.trim()}" added successfully!`);
      // Reset form
      setName('');
      setBasePrice('');
      setStats('');
      setPhotoUrl('');
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setFormError(msg);
      toast.error(`Error: ${msg}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="playerName">Player Name *</Label>
          <Input
            id="playerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Virat Kohli"
            disabled={addPlayer.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (Lakhs) *</Label>
          <Input
            id="basePrice"
            type="number"
            min="0.01"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="e.g. 20"
            disabled={addPlayer.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as PlayerRole)}
            disabled={addPlayer.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PlayerRole.batsman}>Batsman</SelectItem>
              <SelectItem value={PlayerRole.bowler}>Bowler</SelectItem>
              <SelectItem value={PlayerRole.allRounder}>All Rounder</SelectItem>
              <SelectItem value={PlayerRole.wicketKeeper}>Wicket Keeper</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as PlayerCategory)}
            disabled={addPlayer.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PlayerCategory.cappedIndian}>Capped Indian</SelectItem>
              <SelectItem value={PlayerCategory.uncappedIndian}>Uncapped Indian</SelectItem>
              <SelectItem value={PlayerCategory.foreign}>Foreign</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stats">Stats (optional)</Label>
          <Input
            id="stats"
            value={stats}
            onChange={(e) => setStats(e.target.value)}
            placeholder="e.g. Avg 45, SR 130"
            disabled={addPlayer.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photoUrl">Photo URL (optional)</Label>
          <Input
            id="photoUrl"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            disabled={addPlayer.isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photoFile">Or Upload Photo (optional)</Label>
        <Input
          id="photoFile"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          disabled={addPlayer.isPending}
        />
      </div>

      <Button
        type="submit"
        disabled={addPlayer.isPending || actorFetching}
        className="w-full sm:w-auto"
      >
        {addPlayer.isPending ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Adding Player...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Player
          </span>
        )}
      </Button>
    </form>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────

function PlayersTab() {
  const { data: players, isLoading } = useGetPlayers();
  const deletePlayer = useDeletePlayer();
  const updatePlayerState = useUpdatePlayerState();
  const updateCurrentPlayer = useUpdateCurrentPlayer();

  const formatPrice = (price: bigint) => {
    const lakhs = Number(price) / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  };

  const getRoleBadgeColor = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.batsman: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case PlayerRole.bowler: return 'bg-red-500/20 text-red-400 border-red-500/30';
      case PlayerRole.allRounder: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case PlayerRole.wicketKeeper: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getCategoryBadgeColor = (cat: PlayerCategory) => {
    switch (cat) {
      case PlayerCategory.cappedIndian: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case PlayerCategory.uncappedIndian: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case PlayerCategory.foreign: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4 text-primary" />
            Add New Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddPlayerForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Player List ({players?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !players || players.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No players added yet. Use the form above to add players.
            </p>
          ) : (
            <div className="space-y-3">
              {players.map(([id, player]) => (
                <div
                  key={id.toString()}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      <img
                        src={player.photo.getDirectURL()}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/1a1a2e/cyan?text=P';
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getRoleBadgeColor(player.role)}`}>
                          {player.role}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryBadgeColor(player.category)}`}>
                          {player.category}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatPrice(player.basePrice)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await updateCurrentPlayer.mutateAsync(id);
                          toast.success(`${player.name} set as current auction player`);
                        } catch (err: any) {
                          toast.error(err?.message ?? 'Failed to set current player');
                        }
                      }}
                      disabled={updateCurrentPlayer.isPending}
                      title="Set as current auction player"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                    </Button>
                    {player.isDeletable && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={deletePlayer.isPending}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{player.name}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await deletePlayer.mutateAsync(id);
                                  toast.success(`${player.name} deleted`);
                                } catch (err: any) {
                                  toast.error(err?.message ?? 'Failed to delete player');
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab() {
  const { data: teams, isLoading } = useGetTeams();
  const approveTeam = useApproveTeam();
  const rejectTeam = useRejectTeam();
  const approveAll = useApproveAllTeams();
  const rejectAll = useRejectAllTeams();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {teams?.length ?? 0} registered teams
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await approveAll.mutateAsync();
                toast.success('All teams approved');
              } catch (err: any) {
                toast.error(err?.message ?? 'Failed');
              }
            }}
            disabled={approveAll.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Approve All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              try {
                await rejectAll.mutateAsync();
                toast.success('All teams rejected');
              } catch (err: any) {
                toast.error(err?.message ?? 'Failed');
              }
            }}
            disabled={rejectAll.isPending}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Reject All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !teams || teams.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No teams registered yet.</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.name}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
            >
              <div>
                <p className="font-medium text-sm">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.owner} · {team.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(team.status)}
                {team.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                      onClick={async () => {
                        try {
                          await approveTeam.mutateAsync(team.name);
                          toast.success(`${team.name} approved`);
                        } catch (err: any) {
                          toast.error(err?.message ?? 'Failed');
                        }
                      }}
                      disabled={approveTeam.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await rejectTeam.mutateAsync(team.name);
                          toast.success(`${team.name} rejected`);
                        } catch (err: any) {
                          toast.error(err?.message ?? 'Failed');
                        }
                      }}
                      disabled={rejectTeam.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Auction Tab ──────────────────────────────────────────────────────────────

function AuctionTab() {
  const updateAuctionState = useUpdateAuctionState();
  const { data: currentState } = useGetPlayers(); // just to show something
  const createAuction = useCreateAuction();

  const [auctionName, setAuctionName] = useState('');
  const [budget, setBudget] = useState('');
  const [increment, setIncrement] = useState('');
  const [minSquad, setMinSquad] = useState('');
  const [maxSquad, setMaxSquad] = useState('');
  const [auctionError, setAuctionError] = useState('');

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuctionError('');
    try {
      await createAuction.mutateAsync({
        name: auctionName,
        dateTime: BigInt(Date.now()),
        budget: BigInt(Math.round(Number(budget) * 100000)),
        increment: BigInt(Math.round(Number(increment) * 100000)),
        minSquadSize: BigInt(Number(minSquad)),
        maxSquadSize: BigInt(Number(maxSquad)),
      });
      toast.success('Auction created!');
      setAuctionName('');
      setBudget('');
      setIncrement('');
      setMinSquad('');
      setMaxSquad('');
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setAuctionError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            Auction Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Start', state: AuctionStatus.live, icon: Play, color: 'text-green-400' },
              { label: 'Pause', state: AuctionStatus.paused, icon: Pause, color: 'text-yellow-400' },
              { label: 'Complete', state: AuctionStatus.completed, icon: CheckCircle, color: 'text-blue-400' },
              { label: 'Reset', state: AuctionStatus.notStarted, icon: Settings, color: 'text-muted-foreground' },
            ].map(({ label, state, icon: Icon, color }) => (
              <Button
                key={label}
                variant="outline"
                className={`flex flex-col h-16 gap-1 ${color}`}
                onClick={async () => {
                  try {
                    await updateAuctionState.mutateAsync(state);
                    toast.success(`Auction ${label.toLowerCase()}ed`);
                  } catch (err: any) {
                    toast.error(err?.message ?? 'Failed');
                  }
                }}
                disabled={updateAuctionState.isPending}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Create Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAuction} className="space-y-4">
            {auctionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{auctionError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auction Name</Label>
                <Input value={auctionName} onChange={(e) => setAuctionName(e.target.value)} placeholder="IPL 2026" />
              </div>
              <div className="space-y-2">
                <Label>Budget per Team (Lakhs)</Label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="9000" />
              </div>
              <div className="space-y-2">
                <Label>Bid Increment (Lakhs)</Label>
                <Input type="number" value={increment} onChange={(e) => setIncrement(e.target.value)} placeholder="25" />
              </div>
              <div className="space-y-2">
                <Label>Min Squad Size</Label>
                <Input type="number" value={minSquad} onChange={(e) => setMinSquad(e.target.value)} placeholder="18" />
              </div>
              <div className="space-y-2">
                <Label>Max Squad Size</Label>
                <Input type="number" value={maxSquad} onChange={(e) => setMaxSquad(e.target.value)} placeholder="25" />
              </div>
            </div>
            <Button type="submit" disabled={createAuction.isPending}>
              {createAuction.isPending ? 'Creating...' : 'Create Auction'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Approvals Tab ────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const { data: approvals, isLoading } = useListApprovals();
  const setApproval = useSetApproval();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage user approval requests for team access.
      </p>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !approvals || approvals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No approval requests.</p>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.principal.toString()}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                  {approval.principal.toString()}
                </p>
                <p className="text-xs mt-0.5 capitalize">{approval.status}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                  onClick={async () => {
                    try {
                      await setApproval.mutateAsync({ user: approval.principal, status: 'approved' as any });
                      toast.success('User approved');
                    } catch (err: any) {
                      toast.error(err?.message ?? 'Failed');
                    }
                  }}
                  disabled={setApproval.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await setApproval.mutateAsync({ user: approval.principal, status: 'rejected' as any });
                      toast.success('User rejected');
                    } catch (err: any) {
                      toast.error(err?.message ?? 'Failed');
                    }
                  }}
                  disabled={setApproval.isPending}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    queryClient.clear();
    navigate({ to: '/admin/login' });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <h2 className="font-semibold text-lg">Access Denied</h2>
              <p className="text-muted-foreground text-sm mt-1">
                You need admin privileges to access this page.
              </p>
            </div>
            <Button onClick={() => navigate({ to: '/admin/login' })} className="w-full">
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/watch' })}
              className="text-xs"
            >
              Watch Live
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="players">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="players" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Players
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="auction" className="flex items-center gap-1.5">
              <Gavel className="w-3.5 h-3.5" />
              Auction
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayersTab />
          </TabsContent>
          <TabsContent value="teams">
            <TeamsTab />
          </TabsContent>
          <TabsContent value="auction">
            <AuctionTab />
          </TabsContent>
          <TabsContent value="approvals">
            <ApprovalsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
