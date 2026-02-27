import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetTeams,
  useGetPlayers,
  useCurrentAuctionState,
  useCurrentPlayer,
  useCreateAuction,
  useUpdateAuctionState,
  useUpdateCurrentPlayer,
  useApproveTeam,
  useRejectTeam,
  useAddPlayer,
  useDeletePlayer,
  useUpdatePlayerState,
  AuctionStatus,
  TeamStatus,
  PlayerRole,
  PlayerCategory,
} from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import {
  LayoutDashboard, Users, Trophy, Play, Pause, CheckCircle,
  XCircle, Plus, Trash2, Copy, LogOut, Menu, X,
  Shield, AlertCircle, Upload, Settings, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmModal from '../components/ConfirmModal';
import PlayerCard from '../components/PlayerCard';
import SkeletonLoader from '../components/SkeletonLoader';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import {
  formatCurrency, formatTimestamp, getAuctionStatusLabel,
  getTeamStatusColor, getRoleLabel, getCategoryLabel,
} from '../lib/utils';
import { toast } from 'sonner';

// ─── Auction Setup ────────────────────────────────────────────────────────────
function AuctionSetupSection() {
  const createAuction = useCreateAuction();
  const [form, setForm] = useState({
    name: '', dateTime: '', budget: '', increment: '',
    minSquad: '', maxSquad: '', maxForeign: '4',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createdAuctionId, setCreatedAuctionId] = useState<bigint | null>(null);
  const [copied, setCopied] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Auction name is required';
    if (!form.dateTime) e.dateTime = 'Date and time is required';
    else if (new Date(form.dateTime) <= new Date()) e.dateTime = 'Date must be in the future';
    const budget = Number(form.budget);
    if (!form.budget || isNaN(budget) || budget <= 0) e.budget = 'Budget is required';
    else if (budget < 1_000_000) e.budget = 'Budget must be greater than ₹10,00,000';
    const inc = Number(form.increment);
    if (!form.increment || isNaN(inc) || inc <= 0) e.increment = 'Bid increment is required';
    else if (inc < 100_000) e.increment = 'Bid increment must be at least ₹1,00,000';
    const min = Number(form.minSquad);
    const max = Number(form.maxSquad);
    if (!form.minSquad || isNaN(min) || min < 11 || min > 25) e.minSquad = 'Min squad size must be 11–25';
    if (!form.maxSquad || isNaN(max) || max < 11 || max > 25) e.maxSquad = 'Max squad size must be 11–25';
    else if (max <= min) e.maxSquad = 'Max squad size must be greater than min';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    try {
      const dateMs = new Date(form.dateTime).getTime();
      const dateNs = BigInt(dateMs) * 1_000_000n;
      const id = await createAuction.mutateAsync({
        name: form.name,
        dateTime: dateNs,
        budget: BigInt(Math.round(Number(form.budget))),
        increment: BigInt(Math.round(Number(form.increment))),
        minSquadSize: BigInt(Number(form.minSquad)),
        maxSquadSize: BigInt(Number(form.maxSquad)),
      });
      setCreatedAuctionId(id);
      setConfirmOpen(false);
      toast.success('Auction created successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create auction';
      toast.error(msg);
      setConfirmOpen(false);
    }
  };

  const registrationLink = createdAuctionId !== null
    ? `${window.location.origin}/team/register?auction=${createdAuctionId}`
    : null;

  const handleCopy = () => {
    if (registrationLink) {
      navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!');
    }
  };

  const fieldEl = (
    id: string, label: string, type: string, placeholder: string,
    value: string, onChange: (v: string) => void, hint?: string
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} <span className="text-pink">*</span>
      </Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      <Input
        id={id} type={type} value={value}
        onChange={(e) => { onChange(e.target.value); if (errors[id]) setErrors((p) => ({ ...p, [id]: '' })); }}
        placeholder={placeholder}
        className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan"
      />
      {errors[id] && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Create New Auction</h3>
        <p className="text-sm text-muted-foreground">Set up a new IPL auction with all required parameters.</p>
      </div>

      {registrationLink && (
        <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/20">
          <p className="text-sm font-semibold text-cyan mb-2">✅ Auction Created! Share this registration link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2 text-foreground truncate border border-border">
              {registrationLink}
            </code>
            <Button size="sm" onClick={handleCopy} className="bg-cyan text-navy-deep hover:bg-cyan/90 flex-shrink-0">
              <Copy className="w-4 h-4 mr-1" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          {fieldEl('name', 'Auction Name', 'text', 'e.g., IPL Mega Auction 2025', form.name, (v) => setForm((p) => ({ ...p, name: v })))}
        </div>
        {fieldEl('dateTime', 'Auction Date & Time', 'datetime-local', '', form.dateTime, (v) => setForm((p) => ({ ...p, dateTime: v })))}
        {fieldEl('budget', 'Team Budget (₹)', 'number', '10000000', form.budget, (v) => setForm((p) => ({ ...p, budget: v })), 'Min ₹10,00,000')}
        {fieldEl('increment', 'Bid Increment (₹)', 'number', '100000', form.increment, (v) => setForm((p) => ({ ...p, increment: v })), 'Min ₹1,00,000')}
        {fieldEl('minSquad', 'Min Squad Size', 'number', '11', form.minSquad, (v) => setForm((p) => ({ ...p, minSquad: v })), '11–25 players')}
        {fieldEl('maxSquad', 'Max Squad Size', 'number', '25', form.maxSquad, (v) => setForm((p) => ({ ...p, maxSquad: v })), 'Must be > min')}
        {fieldEl('maxForeign', 'Max Foreign Players', 'number', '4', form.maxForeign, (v) => setForm((p) => ({ ...p, maxForeign: v })))}
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full h-11 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Create Auction
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Create Auction"
        message={`Create auction "${form.name}" with a team budget of ${formatCurrency(Number(form.budget) || 0)}?`}
        confirmLabel="Create Auction"
        variant="success"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        isLoading={createAuction.isPending}
      />
    </div>
  );
}

// ─── Team Management ──────────────────────────────────────────────────────────
function TeamManagementSection() {
  const { data: teams, isLoading } = useGetTeams();
  const approveTeam = useApproveTeam();
  const rejectTeam = useRejectTeam();
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; name: string } | null>(null);

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'approve') {
        await approveTeam.mutateAsync(confirmAction.name);
        toast.success(`Team "${confirmAction.name}" approved!`);
      } else {
        await rejectTeam.mutateAsync(confirmAction.name);
        toast.success(`Team "${confirmAction.name}" rejected.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmAction(null);
    }
  };

  if (isLoading) return <SkeletonLoader variant="table-row" count={4} />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Team Management</h3>
        <p className="text-sm text-muted-foreground">Approve or reject registered teams.</p>
      </div>

      {!teams || teams.length === 0 ? (
        <div className="text-center py-12 card-navy rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No teams registered yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share the registration link to invite teams.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {['Team', 'Owner', 'Email', 'Registered', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((team) => (
                <tr key={team.name} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground text-sm">{team.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{team.owner}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{team.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatTimestamp(team.registeredTime)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs border-0 ${getTeamStatusColor(team.status)}`}>{team.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {team.status !== TeamStatus.approved && (
                        <Button size="sm" onClick={() => setConfirmAction({ type: 'approve', name: team.name })}
                          className="h-7 px-2 bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 border-0 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {team.status !== TeamStatus.rejected && (
                        <Button size="sm" onClick={() => setConfirmAction({ type: 'reject', name: team.name })}
                          className="h-7 px-2 bg-destructive/20 text-destructive hover:bg-destructive/30 border-0 text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Approve Team' : 'Reject Team'}
        message={`Are you sure you want to ${confirmAction?.type} team "${confirmAction?.name}"?`}
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'approve' ? 'success' : 'destructive'}
        onConfirm={handleAction}
        onCancel={() => setConfirmAction(null)}
        isLoading={approveTeam.isPending || rejectTeam.isPending}
      />
    </div>
  );
}

// ─── Player Management ────────────────────────────────────────────────────────
function PlayerManagementSection() {
  const { data: players, isLoading } = useGetPlayers();
  const { data: auctionState } = useCurrentAuctionState();
  const addPlayer = useAddPlayer();
  const deletePlayer = useDeletePlayer();

  const [form, setForm] = useState({
    name: '', role: PlayerRole.batsman as PlayerRole,
    category: PlayerCategory.cappedIndian as PlayerCategory,
    basePrice: '', stats: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isLive = auctionState === AuctionStatus.live;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      if (errors.photo) setErrors((p) => ({ ...p, photo: '' }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Player name is required';
    if (!photoFile) e.photo = 'Player photo is required';
    const price = Number(form.basePrice);
    if (!form.basePrice || isNaN(price) || price <= 0) e.basePrice = 'Base price is required';
    else if (price < 20_000) e.basePrice = 'Base price must be at least ₹20,000';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setConfirmAdd(true);
  };

  const handleConfirmAdd = async () => {
    if (!photoFile) return;
    try {
      const arrayBuffer = await photoFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => setUploadProgress(pct));
      await addPlayer.mutateAsync({
        name: form.name.trim(), role: form.role, category: form.category,
        basePrice: BigInt(Math.round(Number(form.basePrice))),
        stats: form.stats.trim() || null, photo: blob, isDeletable: true,
      });
      setForm({ name: '', role: PlayerRole.batsman, category: PlayerCategory.cappedIndian, basePrice: '', stats: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
      setUploadProgress(0);
      setConfirmAdd(false);
      toast.success('Player added successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add player');
      setConfirmAdd(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deletePlayer.mutateAsync(deleteTarget);
      toast.success('Player deleted.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete player');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Player Management</h3>
        <p className="text-sm text-muted-foreground">Add players to the auction pool.</p>
      </div>

      <div className="card-navy rounded-xl p-5 border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-4">Add New Player</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-sm font-medium text-foreground">Player Name <span className="text-pink">*</span></Label>
              <Input value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="e.g., Virat Kohli"
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan" />
              {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label className="text-sm font-medium text-foreground">Player Photo <span className="text-pink">*</span></Label>
              <div className="mt-1 flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${errors.photo ? 'border-destructive' : 'border-border hover:border-cyan/50'}`}>
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{photoFile ? photoFile.name : 'Click to upload photo'}</p>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-2 bg-secondary rounded-full h-1.5">
                        <div className="bg-cyan h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0" />
                )}
              </div>
              {errors.photo && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.photo}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as PlayerRole }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value={PlayerRole.batsman}>Batsman</SelectItem>
                  <SelectItem value={PlayerRole.bowler}>Bowler</SelectItem>
                  <SelectItem value={PlayerRole.allRounder}>All-Rounder</SelectItem>
                  <SelectItem value={PlayerRole.wicketKeeper}>Wicket-Keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as PlayerCategory }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value={PlayerCategory.cappedIndian}>Capped Indian</SelectItem>
                  <SelectItem value={PlayerCategory.uncappedIndian}>Uncapped Indian</SelectItem>
                  <SelectItem value={PlayerCategory.foreign}>Overseas/Foreign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Base Price (₹) <span className="text-pink">*</span></Label>
              <Input type="number" value={form.basePrice}
                onChange={(e) => { setForm((p) => ({ ...p, basePrice: e.target.value })); if (errors.basePrice) setErrors((p) => ({ ...p, basePrice: '' })); }}
                placeholder="20000"
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan" />
              {errors.basePrice && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.basePrice}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Player Stats (optional)</Label>
              <Input value={form.stats}
                onChange={(e) => setForm((p) => ({ ...p, stats: e.target.value }))}
                placeholder="e.g., Avg: 45.2, SR: 138"
                className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan" />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Add Player
          </Button>
        </form>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Player Pool ({players?.length ?? 0} players)</h4>
        {isLoading ? (
          <SkeletonLoader variant="player-card" count={4} />
        ) : !players || players.length === 0 ? (
          <div className="text-center py-12 card-navy rounded-xl">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No players added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map(([id, player]) => (
              <div key={id.toString()} className="relative group">
                <PlayerCard player={player} size="sm" />
                {!isLive && player.isDeletable && (
                  <button onClick={() => setDeleteTarget(id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isLive && (
                  <div className="absolute top-2 right-2">
                    <Badge className="text-xs bg-chart-3/20 text-chart-3 border-0">Live</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal open={confirmAdd} title="Add Player"
        message={`Add "${form.name}" with base price ${formatCurrency(Number(form.basePrice) || 0)} to the auction pool?`}
        confirmLabel="Add Player" variant="success"
        onConfirm={handleConfirmAdd} onCancel={() => setConfirmAdd(false)} isLoading={addPlayer.isPending} />
      <ConfirmModal open={deleteTarget !== null} title="Delete Player"
        message="Are you sure you want to delete this player? This cannot be undone."
        confirmLabel="Delete" variant="destructive"
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isLoading={deletePlayer.isPending} />
    </div>
  );
}

// ─── Auction Control ──────────────────────────────────────────────────────────
function AuctionControlSection() {
  const { data: auctionState } = useCurrentAuctionState();
  const { data: currentPlayer } = useCurrentPlayer();
  const { data: players } = useGetPlayers();
  const { data: teams } = useGetTeams();
  const updateState = useUpdateAuctionState();
  const updateCurrentPlayer = useUpdateCurrentPlayer();
  const updatePlayerState = useUpdatePlayerState();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'start' | 'pause' | 'resume' | 'complete';
    label: string;
    message: string;
  } | null>(null);

  const isLive = auctionState === AuctionStatus.live;
  const isPaused = auctionState === AuctionStatus.paused;
  const isNotStarted = !auctionState || auctionState === AuctionStatus.notStarted;
  const isCompleted = auctionState === AuctionStatus.completed;

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      switch (confirmAction.type) {
        case 'start':
          await updateState.mutateAsync(AuctionStatus.live);
          if (players) {
            for (const [id, p] of players) {
              if (p.isDeletable) await updatePlayerState.mutateAsync({ playerId: id, isDeletable: false });
            }
          }
          toast.success('Auction started!');
          break;
        case 'pause':
          await updateState.mutateAsync(AuctionStatus.paused);
          toast.success('Auction paused.');
          break;
        case 'resume':
          await updateState.mutateAsync(AuctionStatus.live);
          toast.success('Auction resumed!');
          break;
        case 'complete':
          await updateState.mutateAsync(AuctionStatus.completed);
          toast.success('Auction completed!');
          break;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSetCurrentPlayer = async () => {
    if (!selectedPlayerId) return;
    try {
      await updateCurrentPlayer.mutateAsync(BigInt(selectedPlayerId));
      toast.success('Current player updated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update player');
    }
  };

  const statusColor = isLive ? 'bg-chart-3/10 border-chart-3/20' :
    isPaused ? 'bg-chart-4/10 border-chart-4/20' :
    isCompleted ? 'bg-cyan/10 border-cyan/20' : 'bg-secondary border-border';

  const dotColor = isLive ? 'bg-chart-3 animate-pulse' :
    isPaused ? 'bg-chart-4' : isCompleted ? 'bg-cyan' : 'bg-muted-foreground';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Auction Control Panel</h3>
        <p className="text-sm text-muted-foreground">Manage the live auction state and current player.</p>
      </div>

      {/* Status Banner */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border ${statusColor}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dotColor}`} />
          <span className="font-semibold text-foreground">
            Status: {isLive ? 'Live' : isPaused ? 'Paused' : isCompleted ? 'Completed' : 'Not Started'}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isNotStarted && (
            <Button size="sm" onClick={() => setConfirmAction({ type: 'start', label: 'Start Auction', message: 'Start the auction? Players will be locked and cannot be deleted.' })}
              className="bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 border-0">
              <Play className="w-4 h-4 mr-1" /> Start
            </Button>
          )}
          {isLive && (
            <>
              <Button size="sm" onClick={() => setConfirmAction({ type: 'pause', label: 'Pause Auction', message: 'Pause the auction?' })}
                className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30 border-0">
                <Pause className="w-4 h-4 mr-1" /> Pause
              </Button>
              <Button size="sm" onClick={() => setConfirmAction({ type: 'complete', label: 'End Auction', message: 'End the auction? This cannot be undone.' })}
                className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-0">
                End Auction
              </Button>
            </>
          )}
          {isPaused && (
            <Button size="sm" onClick={() => setConfirmAction({ type: 'resume', label: 'Resume Auction', message: 'Resume the auction?' })}
              className="bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 border-0">
              <Play className="w-4 h-4 mr-1" /> Resume
            </Button>
          )}
        </div>
      </div>

      {/* Current Player */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-navy rounded-xl p-5 border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4">Set Current Player</h4>
          <div className="flex gap-2">
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="flex-1 bg-input border-border text-foreground">
                <SelectValue placeholder="Select a player..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {players?.map(([id, p]) => (
                  <SelectItem key={id.toString()} value={id.toString()}>
                    {p.name} — {formatCurrency(p.basePrice)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSetCurrentPlayer} disabled={!selectedPlayerId || updateCurrentPlayer.isPending}
              className="bg-cyan text-navy-deep hover:bg-cyan/90">
              Set
            </Button>
          </div>
        </div>

        {currentPlayer && (
          <div className="card-navy rounded-xl p-5 border border-cyan/20">
            <h4 className="text-sm font-semibold text-cyan mb-3">Current Player on Auction</h4>
            <PlayerCard player={currentPlayer} size="sm" />
          </div>
        )}
      </div>

      {/* Teams Overview */}
      {teams && teams.length > 0 && (
        <div className="card-navy rounded-xl p-5 border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4">Teams Overview</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.filter(t => t.status === TeamStatus.approved).map((team) => (
              <div key={team.name} className="bg-secondary rounded-lg p-3">
                <p className="font-medium text-foreground text-sm">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.owner}</p>
                <Badge className="mt-1 text-xs bg-chart-3/20 text-chart-3 border-0">Approved</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.label ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.label ?? 'Confirm'}
        variant={confirmAction?.type === 'complete' ? 'destructive' : 'success'}
        onConfirm={handleAction}
        onCancel={() => setConfirmAction(null)}
        isLoading={updateState.isPending || updatePlayerState.isPending}
      />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('auction');

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    void navigate({ to: '/admin/login' });
  };

  const tabs = [
    { id: 'auction', label: 'Auction Setup', icon: Settings },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'players', label: 'Players', icon: Trophy },
    { id: 'control', label: 'Live Control', icon: Play },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <div className="flex-1 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-sidebar/50 p-4 gap-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-4">
            <Shield className="w-5 h-5 text-cyan" />
            <span className="font-semibold text-foreground text-sm">Admin Panel</span>
          </div>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === id ? 'bg-cyan/10 text-cyan border border-cyan/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <div className="mt-auto pt-4 border-t border-border">
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative z-50 flex flex-col w-64 bg-sidebar border-r border-border p-4 gap-1 animate-slide-in-right">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan" />
                  <span className="font-semibold text-foreground text-sm">Admin Panel</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                    activeTab === id ? 'bg-cyan/10 text-cyan border border-cyan/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              <div className="mt-auto pt-4 border-t border-border">
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 p-4 border-b border-border">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-foreground">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
            {activeTab === 'auction' && <AuctionSetupSection />}
            {activeTab === 'teams' && <TeamManagementSection />}
            {activeTab === 'players' && <PlayerManagementSection />}
            {activeTab === 'control' && <AuctionControlSection />}
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
