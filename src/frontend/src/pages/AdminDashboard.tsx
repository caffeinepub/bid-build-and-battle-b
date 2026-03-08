import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  Download,
  Edit,
  Gavel,
  Key,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  Share2,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useListApprovals, useSetApproval } from "../hooks/useQueries";
// Note: useActor is not needed here — admin approval now uses localStorage
import {
  type AuctionRoom,
  type LocalPlayer,
  type LocalPlayerCategory,
  type LocalPlayerRole,
  type TeamRecord,
  addAuctionRoom,
  addLocalPlayer,
  addTeam,
  approveTeamLocal,
  deleteLocalPlayer,
  generateRoomKey,
  getAuctionEngine,
  getAuctionRooms,
  getLocalPlayers,
  getTeams,
  rejectTeamLocal,
  resetAllAuctionData,
  resetAuctionEngineOnly,
  syncTeamToEngine,
  updateLocalPlayer,
} from "../lib/auctionStore";
import { clearAdminSession } from "../lib/authConstants";
// Import backendSync to activate self-registration side-effect, then use sync fns
import "../lib/backendSync";
import {
  clearAllBackendData,
  saveRoomsToBackendNow,
  saveTeamsToBackendNow,
  syncEngineToBackend,
  syncPlayersToBackend,
  syncRoomsToBackend,
  syncTeamsToBackend,
} from "../lib/backendSync";
import { exportCredentials } from "../lib/sessionExport";

// ─── Add Player Form ──────────────────────────────────────────────────────────

function AddPlayerForm({ onPlayerAdded }: { onPlayerAdded: () => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState<LocalPlayerRole>("batsman");
  const [category, setCategory] = useState<LocalPlayerCategory>("cappedIndian");
  const [basePrice, setBasePrice] = useState("");
  const [stats, setStats] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Player name is required");
      return;
    }
    const priceNum = Number(basePrice);
    if (!basePrice || Number.isNaN(priceNum) || priceNum <= 0) {
      setFormError("Valid base price is required");
      return;
    }

    setIsPending(true);
    try {
      // Resolve photo — use data URL if file uploaded, else URL field, else placeholder
      let resolvedPhoto = "https://placehold.co/200x200/1a1a2e/00ffff?text=P";
      if (photoFile) {
        resolvedPhoto = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      } else if (photoUrl.trim()) {
        resolvedPhoto = photoUrl.trim();
      }

      addLocalPlayer({
        name: name.trim(),
        country: country.trim() || undefined,
        role,
        category,
        basePrice: Math.round(priceNum * 100_000), // Lakhs to rupees
        stats: stats.trim() || undefined,
        photoUrl: resolvedPhoto,
      });

      toast.success(`Player "${name.trim()}" added successfully!`);
      setName("");
      setCountry("");
      setBasePrice("");
      setStats("");
      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onPlayerAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
      toast.error(`Error: ${msg}`);
    } finally {
      setIsPending(false);
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
            data-ocid="add_player.name_input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Virat Kohli"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="playerCountry">Country</Label>
          <Input
            id="playerCountry"
            data-ocid="add_player.country_input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. India"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (Lakhs) *</Label>
          <Input
            id="basePrice"
            data-ocid="add_player.base_price_input"
            type="number"
            min="0.01"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="e.g. 20"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as LocalPlayerRole)}
            disabled={isPending}
          >
            <SelectTrigger data-ocid="add_player.role_select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="batsman">Batsman</SelectItem>
              <SelectItem value="bowler">Bowler</SelectItem>
              <SelectItem value="allRounder">All Rounder</SelectItem>
              <SelectItem value="wicketKeeper">Wicket Keeper</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as LocalPlayerCategory)}
            disabled={isPending}
          >
            <SelectTrigger data-ocid="add_player.category_select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cappedIndian">Capped Indian</SelectItem>
              <SelectItem value="uncappedIndian">Uncapped Indian</SelectItem>
              <SelectItem value="foreign">Foreign</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stats">Stats (optional)</Label>
          <Input
            id="stats"
            data-ocid="add_player.stats_input"
            value={stats}
            onChange={(e) => setStats(e.target.value)}
            placeholder="e.g. Avg 45, SR 130"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photoUrl">Photo URL (optional)</Label>
          <Input
            id="photoUrl"
            data-ocid="add_player.photo_url_input"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            disabled={isPending || !!photoFile}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="photoFile">Or Upload Photo (optional)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="photoFile"
            data-ocid="add_player.upload_button"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isPending}
            className="flex-1"
          />
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
            />
          )}
        </div>
      </div>
      <Button
        type="submit"
        data-ocid="add_player.submit_button"
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        {isPending ? (
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

// ─── Player Auction Status (derived from engine) ─────────────────────────────

type PlayerAuctionStatus = "LIVE" | "SOLD" | "UNSOLD" | "UPCOMING";

function getPlayerAuctionStatus(
  playerId: string,
  playerStatus: LocalPlayer["status"],
): PlayerAuctionStatus {
  const engine = getAuctionEngine();
  if (engine?.currentPlayerId === playerId) return "LIVE";
  if (engine?.results.some((r) => r.playerId === playerId)) return "SOLD";
  if (playerStatus === "unsold") return "UNSOLD";
  return "UPCOMING";
}

function PlayerAuctionStatusBadge({ status }: { status: PlayerAuctionStatus }) {
  switch (status) {
    case "LIVE":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          LIVE
        </span>
      );
    case "SOLD":
      return (
        <span className="text-xs px-1.5 py-0.5 rounded border bg-green-500/20 text-green-400 border-green-500/30">
          SOLD
        </span>
      );
    case "UNSOLD":
      return (
        <span className="text-xs px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">
          UNSOLD
        </span>
      );
    default:
      return (
        <span className="text-xs px-1.5 py-0.5 rounded border bg-cyan/10 text-cyan border-cyan/30">
          UPCOMING
        </span>
      );
  }
}

// ─── Edit Player Dialog ───────────────────────────────────────────────────────

function EditPlayerDialog({
  player,
  onSaved,
}: { player: LocalPlayer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(player.name);
  const [editCountry, setEditCountry] = useState(player.country ?? "");
  const [editRole, setEditRole] = useState<LocalPlayerRole>(player.role);
  const [editBasePrice, setEditBasePrice] = useState(
    String(player.basePrice / 100_000),
  );
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    if (!editName.trim()) {
      setError("Name is required");
      return;
    }
    const priceNum = Number(editBasePrice);
    if (!editBasePrice || Number.isNaN(priceNum) || priceNum <= 0) {
      setError("Valid base price required");
      return;
    }
    updateLocalPlayer(player.id, {
      name: editName.trim(),
      country: editCountry.trim() || undefined,
      role: editRole,
      basePrice: Math.round(priceNum * 100_000),
    });
    toast.success(`${editName.trim()} updated`);
    setOpen(false);
    onSaved();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        data-ocid="players.edit_button"
        onClick={() => {
          setEditName(player.name);
          setEditCountry(player.country ?? "");
          setEditRole(player.role);
          setEditBasePrice(String(player.basePrice / 100_000));
          setError("");
          setOpen(true);
        }}
        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
      >
        <Edit className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            data-ocid="players.dialog"
          >
            <h3 className="text-base font-bold text-foreground mb-4">
              Edit Player
            </h3>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  data-ocid="players.name_input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Player name"
                />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input
                  data-ocid="players.country_input"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="e.g. India"
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as LocalPlayerRole)}
                >
                  <SelectTrigger data-ocid="players.role_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="batsman">Batsman</SelectItem>
                    <SelectItem value="bowler">Bowler</SelectItem>
                    <SelectItem value="allRounder">All Rounder</SelectItem>
                    <SelectItem value="wicketKeeper">Wicket Keeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Base Price (Lakhs) *</Label>
                <Input
                  data-ocid="players.base_price_input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editBasePrice}
                  onChange={(e) => setEditBasePrice(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button
                variant="outline"
                data-ocid="players.cancel_button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button data-ocid="players.save_button" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────

function PlayersTab() {
  const [players, setPlayers] = useState<LocalPlayer[]>(() =>
    getLocalPlayers(),
  );

  const refreshPlayers = () => setPlayers(getLocalPlayers());

  const formatPrice = (priceRupees: number) =>
    `₹${(priceRupees / 100_000).toFixed(2)}L`;

  const getRoleBadgeColor = (role: LocalPlayerRole) => {
    switch (role) {
      case "batsman":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "bowler":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "allRounder":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "wicketKeeper":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getRoleLabelLocal = (role: LocalPlayerRole) => {
    switch (role) {
      case "batsman":
        return "Batsman";
      case "bowler":
        return "Bowler";
      case "allRounder":
        return "All Rounder";
      case "wicketKeeper":
        return "Wicket Keeper";
      default:
        return role;
    }
  };

  const getCategoryBadgeColor = (cat: LocalPlayerCategory) => {
    switch (cat) {
      case "cappedIndian":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "uncappedIndian":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "foreign":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryLabelLocal = (cat: LocalPlayerCategory) => {
    switch (cat) {
      case "cappedIndian":
        return "Capped Indian";
      case "uncappedIndian":
        return "Uncapped Indian";
      case "foreign":
        return "Foreign";
      default:
        return cat;
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
          <AddPlayerForm onPlayerAdded={refreshPlayers} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Player List ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p
              className="text-muted-foreground text-sm text-center py-8"
              data-ocid="players.empty_state"
            >
              No players added yet. Use the form above to add players.
            </p>
          ) : (
            <div className="space-y-3" data-ocid="players.list">
              {players.map((player, idx) => {
                const auctionStatus = getPlayerAuctionStatus(
                  player.id,
                  player.status,
                );
                return (
                  <div
                    key={player.id}
                    data-ocid={`players.item.${idx + 1}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/40x40/1a1a2e/00ffff?text=P";
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        {player.country && (
                          <p className="text-xs text-muted-foreground">
                            🌍 {player.country}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${getRoleBadgeColor(player.role)}`}
                          >
                            {getRoleLabelLocal(player.role)}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryBadgeColor(player.category)}`}
                          >
                            {getCategoryLabelLocal(player.category)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(player.basePrice)}
                          </span>
                          <PlayerAuctionStatusBadge status={auctionStatus} />
                        </div>
                        {player.stats && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {player.stats}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EditPlayerDialog
                        player={player}
                        onSaved={refreshPlayers}
                      />
                      {player.status === "available" &&
                        auctionStatus !== "LIVE" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                data-ocid={`players.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Player
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <strong>{player.name}</strong>? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-ocid="players.cancel_button">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  data-ocid="players.confirm_button"
                                  onClick={() => {
                                    deleteLocalPlayer(player.id);
                                    refreshPlayers();
                                    toast.success(`${player.name} deleted`);
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Teams Tab (localStorage-based approval management) ───────────────────────

function TeamsTab() {
  const [teams, setTeams] = useState<TeamRecord[]>(() => getTeams());

  const refresh = () => setTeams(getTeams());

  const handleApprove = (teamId: string, teamName: string) => {
    approveTeamLocal(teamId);
    refresh();
    toast.success(`${teamName} approved ✓`);
  };

  const handleReject = (teamId: string, teamName: string) => {
    rejectTeamLocal(teamId);
    refresh();
    toast.error(`${teamName} rejected`);
  };

  const handleApproveAll = () => {
    const pendingTeams = teams.filter(
      (t) => (t.approvalStatus ?? "pending") === "pending",
    );
    for (const t of pendingTeams) approveTeamLocal(t.teamId);
    refresh();
    toast.success(`${pendingTeams.length} team(s) approved`);
  };

  const getStatusBadge = (
    status: "pending" | "approved" | "rejected" | undefined,
  ) => {
    switch (status ?? "pending") {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
            ✓ Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
            ✗ Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
            ⏳ Pending
          </Badge>
        );
    }
  };

  const pendingCount = teams.filter(
    (t) => (t.approvalStatus ?? "pending") === "pending",
  ).length;
  const auctions = getAuctionRooms();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Team Approvals
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {teams.length} team{teams.length !== 1 ? "s" : ""} registered
            {pendingCount > 0 && (
              <span className="text-yellow-400 ml-1 font-semibold">
                · {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            data-ocid="teams.confirm_button"
            onClick={handleApproveAll}
            disabled={pendingCount === 0}
            className="text-green-400 border-green-500/30 hover:bg-green-500/10 gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve All Pending
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-ocid="teams.secondary_button"
            onClick={refresh}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Approval instructions */}
      <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-cyan font-semibold">How it works:</span> Teams
          enter their Room Key and Passkey on the login page. If their status is{" "}
          <span className="text-yellow-400">Pending</span>, they'll see a
          waiting screen until you approve them here. After approval, they
          auto-redirect to the auction. After approving, use{" "}
          <span className="text-cyan">Export Credentials</span> in the Rooms
          &amp; Teams tab so teams can import the updated approval status.
        </p>
      </div>

      {teams.length === 0 ? (
        <p
          className="text-muted-foreground text-sm text-center py-8"
          data-ocid="teams.empty_state"
        >
          No teams added yet. Go to Rooms &amp; Teams to add teams.
        </p>
      ) : (
        <div className="space-y-3" data-ocid="teams.list">
          {teams.map((team, idx) => {
            const auction = auctions.find(
              (a) => a.auctionId === team.auctionId,
            );
            const status = team.approvalStatus ?? "pending";
            return (
              <div
                key={team.teamId}
                data-ocid={`teams.item.${idx + 1}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  status === "approved"
                    ? "border-green-500/20 bg-green-500/5"
                    : status === "rejected"
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-yellow-500/20 bg-yellow-500/5"
                }`}
              >
                <div className="min-w-0 mr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">
                      {team.teamName}
                    </p>
                    {getStatusBadge(team.approvalStatus)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="font-mono text-xs text-green-400">
                      {team.passkey}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · ₹{(team.budgetRemaining / 10_000_000).toFixed(1)} Cr
                    </span>
                    {auction && (
                      <span className="text-xs text-muted-foreground">
                        · {auction.auctionName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid={`teams.confirm_button.${idx + 1}`}
                      onClick={() => handleApprove(team.teamId, team.teamName)}
                      className="text-green-400 border-green-500/30 hover:bg-green-500/10 gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  )}
                  {status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid={`teams.delete_button.${idx + 1}`}
                      onClick={() => handleReject(team.teamId, team.teamName)}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  )}
                  {status === "approved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      data-ocid={`teams.delete_button.${idx + 1}`}
                      onClick={() => handleReject(team.teamId, team.teamName)}
                      className="text-muted-foreground hover:text-red-400 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Approvals Tab ────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const { data: approvals, isLoading } = useListApprovals();
  const setApproval = useSetApproval();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {approvals?.length ?? 0} approval requests
      </h3>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !approvals || approvals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No approval requests yet.
        </p>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.principal.toString()}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                  {approval.principal.toString()}
                </p>
                <p className="text-xs mt-0.5 capitalize text-foreground">
                  {approval.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {approval.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                    onClick={async () => {
                      try {
                        await setApproval.mutateAsync({
                          user: approval.principal,
                          status: "approved",
                        });
                        toast.success("User approved");
                      } catch (err: unknown) {
                        toast.error(
                          err instanceof Error ? err.message : "Failed",
                        );
                      }
                    }}
                    disabled={setApproval.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                )}
                {approval.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={async () => {
                      try {
                        await setApproval.mutateAsync({
                          user: approval.principal,
                          status: "rejected",
                        });
                        toast.success("User rejected");
                      } catch (err: unknown) {
                        toast.error(
                          err instanceof Error ? err.message : "Failed",
                        );
                      }
                    }}
                    disabled={setApproval.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
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
  const navigate = useNavigate();
  const [engine, setEngine] = useState(() => getAuctionEngine());

  const isCompleted = engine?.status === "completed";

  const handleNewAuction = async () => {
    // Wipe localStorage immediately
    resetAllAuctionData();
    setEngine(null);
    // Also clear the backend canister so other devices see the wipe
    await clearAllBackendData();
    toast.success(
      "All data wiped. Create a new auction room, add teams and players to start fresh.",
    );
  };

  const handleResetEngine = () => {
    resetAuctionEngineOnly();
    setEngine(null);
    toast.success(
      "Auction reset. Same teams are ready. Go to Auction Room to set up a new round.",
    );
  };

  return (
    <div className="space-y-6">
      {/* Completed auction banner */}
      {isCompleted && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-yellow-400">
              <Trophy className="w-4 h-4" />
              Auction Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The previous auction has ended. Choose an option to continue:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-cyan/20 bg-cyan/5 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Re-run with same teams
                </p>
                <p className="text-xs text-muted-foreground">
                  Keeps all teams and their passkeys. Resets budgets, squads,
                  and engine. You can add new players.
                </p>
                <Button
                  data-ocid="auction_tab.secondary_button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetEngine}
                  className="border-cyan/30 text-cyan hover:bg-cyan/10 gap-1.5 w-full"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-run (same teams)
                </Button>
              </div>
              <div className="p-4 rounded-xl border border-pink/20 bg-pink/5 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Start brand new auction
                </p>
                <p className="text-xs text-muted-foreground">
                  Wipes everything — all teams, players, rooms, and engine
                  state. A completely fresh start.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      data-ocid="auction_tab.delete_button"
                      size="sm"
                      variant="outline"
                      className="border-pink/30 text-pink hover:bg-pink/10 gap-1.5 w-full"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Auction
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Start a New Auction?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete{" "}
                        <strong>
                          all rooms, teams, players, and bid history
                        </strong>
                        . Every device will see a completely fresh start. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="new_auction.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-ocid="new_auction.confirm_button"
                        onClick={() => void handleNewAuction()}
                        className="bg-pink hover:bg-pink/80 text-white"
                      >
                        Yes, Wipe Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-primary" />
            Live Auction Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-cyan/20 bg-cyan/5 space-y-3">
            <p className="text-sm text-foreground font-medium">
              Use the Auction Room for live controls
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The multiplayer auction engine is fully managed from the{" "}
              <strong className="text-cyan">Auction Room</strong>. Go there to:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              <li>Initialize and start the auction</li>
              <li>Configure bid increment, max squad, and foreign limits</li>
              <li>Start, pause, resume, and end the auction</li>
              <li>Force sell or mark players unsold</li>
              <li>Skip players and manage the queue</li>
              <li>Watch real-time bids from all teams</li>
            </ul>
            <Button
              data-ocid="auction_tab.primary_button"
              onClick={() => navigate({ to: "/admin/auction-room" })}
              className="gradient-cyan-pink text-white font-semibold gap-2"
            >
              <Radio className="w-4 h-4" />
              Go to Auction Room
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleCopy}
      className={`gap-1.5 text-xs font-mono transition-all ${copied ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-cyan border-cyan/30 hover:bg-cyan/10"}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {label ?? text}
    </Button>
  );
}

// ─── Rooms & Teams Tab ────────────────────────────────────────────────────────

function RoomsTeamsTab() {
  const [auctions, setAuctions] = useState<AuctionRoom[]>(() =>
    getAuctionRooms(),
  );
  const [teams, setTeams] = useState<TeamRecord[]>(() => getTeams());

  // Create Room form
  const [newAuctionName, setNewAuctionName] = useState("");
  const [newRoomKey, setNewRoomKey] = useState(() => generateRoomKey());
  const [roomFormError, setRoomFormError] = useState("");
  const [lastCreatedRoom, setLastCreatedRoom] = useState<AuctionRoom | null>(
    null,
  );

  // Create Team form
  const [selectedAuctionId, setSelectedAuctionId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newBudgetCr, setNewBudgetCr] = useState("");
  const [teamFormError, setTeamFormError] = useState("");
  const [lastCreatedTeam, setLastCreatedTeam] = useState<TeamRecord | null>(
    null,
  );

  const refreshData = () => {
    setAuctions(getAuctionRooms());
    setTeams(getTeams());
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError("");
    if (!newAuctionName.trim()) {
      setRoomFormError("Auction name is required.");
      return;
    }
    if (!newRoomKey.trim()) {
      setRoomFormError("Room key is required.");
      return;
    }
    // Check for duplicate room key
    const existing = getAuctionRooms();
    if (
      existing.some((a) => a.roomKey.toUpperCase() === newRoomKey.toUpperCase())
    ) {
      setRoomFormError("Room key already exists. Please regenerate.");
      return;
    }
    const room = addAuctionRoom({
      auctionName: newAuctionName.trim(),
      roomKey: newRoomKey.trim().toUpperCase(),
      status: "waiting",
    });
    setLastCreatedRoom(room);
    setNewAuctionName("");
    setNewRoomKey(generateRoomKey());
    refreshData();
    // Await backend confirmation so teams on other devices can immediately log in
    try {
      await saveRoomsToBackendNow(getAuctionRooms());
    } catch {
      // Backend unavailable — local data is still saved, warn user
      toast.warning(
        "Room saved locally. Backend sync failed — teams on other devices may need to wait a moment before joining.",
      );
    }
    toast.success(`Auction room "${room.auctionName}" created!`);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamFormError("");
    if (!selectedAuctionId) {
      setTeamFormError("Please select an auction room.");
      return;
    }
    if (!newTeamName.trim()) {
      setTeamFormError("Team name is required.");
      return;
    }
    const budgetCr = Number(newBudgetCr);
    if (!newBudgetCr || Number.isNaN(budgetCr) || budgetCr <= 0) {
      setTeamFormError("Valid budget (in Crores) is required.");
      return;
    }
    const budgetRupees = Math.round(budgetCr * 10_000_000); // Crores to rupees
    const team = addTeam(newTeamName.trim(), selectedAuctionId, budgetRupees);
    // Sync team into AuctionEngine if one exists
    syncTeamToEngine(team.teamId, team.teamName, budgetRupees);
    setLastCreatedTeam(team);
    setNewTeamName("");
    setNewBudgetCr("");
    refreshData();
    // Await backend confirmation so teams on other devices can immediately log in
    try {
      await Promise.all([
        saveTeamsToBackendNow(getTeams()),
        saveRoomsToBackendNow(getAuctionRooms()),
      ]);
    } catch {
      toast.warning(
        "Team saved locally. Backend sync failed — teams on other devices may need the Export Code to join.",
      );
    }
    toast.success(
      `Team "${team.teamName}" created with passkey ${team.passkey}!`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Auction Room */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4 text-primary" />
            Create Auction Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            {roomFormError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{roomFormError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newAuctionName">Auction Name *</Label>
                <Input
                  id="newAuctionName"
                  data-ocid="rooms_teams.auction_name_input"
                  value={newAuctionName}
                  onChange={(e) => setNewAuctionName(e.target.value)}
                  placeholder="e.g. IPL Mega Auction 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newRoomKey">Room Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="newRoomKey"
                    data-ocid="rooms_teams.room_key_input"
                    value={newRoomKey}
                    onChange={(e) =>
                      setNewRoomKey(e.target.value.toUpperCase())
                    }
                    className="font-mono tracking-wider"
                    placeholder="AUCTION-XXXX"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRoomKey(generateRoomKey())}
                    className="shrink-0 gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-generated. Share this with teams.
                </p>
              </div>
            </div>
            <Button
              type="submit"
              data-ocid="rooms_teams.create_room_button"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          </form>

          {lastCreatedRoom && (
            <div className="mt-4 p-4 rounded-xl border border-cyan/30 bg-cyan/5">
              <p className="text-sm font-medium text-foreground mb-2">
                ✅ Room created:{" "}
                <span className="text-cyan">{lastCreatedRoom.auctionName}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Room Key:</span>
                <code className="font-mono text-sm bg-secondary px-2 py-1 rounded border border-border text-cyan">
                  {lastCreatedRoom.roomKey}
                </code>
                <CopyButton text={lastCreatedRoom.roomKey} label="Copy" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Add Team to Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTeam} className="space-y-4">
            {teamFormError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{teamFormError}</AlertDescription>
              </Alert>
            )}
            {auctions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No auction rooms yet. Create one above first.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Auction Room *</Label>
                  <Select
                    value={selectedAuctionId}
                    onValueChange={setSelectedAuctionId}
                  >
                    <SelectTrigger data-ocid="rooms_teams.auction_select">
                      <SelectValue placeholder="Select auction..." />
                    </SelectTrigger>
                    <SelectContent>
                      {auctions.map((a) => (
                        <SelectItem key={a.auctionId} value={a.auctionId}>
                          {a.auctionName}{" "}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({a.roomKey})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTeamName">Team Name *</Label>
                  <Input
                    id="newTeamName"
                    data-ocid="rooms_teams.team_name_input"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Chennai Challengers"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newBudget">Budget (Crores) *</Label>
                  <Input
                    id="newBudget"
                    data-ocid="rooms_teams.budget_input"
                    type="number"
                    min="1"
                    step="0.5"
                    value={newBudgetCr}
                    onChange={(e) => setNewBudgetCr(e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
            )}
            {auctions.length > 0 && (
              <Button
                type="submit"
                data-ocid="rooms_teams.add_team_button"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Team
              </Button>
            )}
          </form>

          {lastCreatedTeam && (
            <div className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
              <p className="text-sm font-medium text-foreground mb-2">
                ✅ Team created:{" "}
                <span className="text-green-400">
                  {lastCreatedTeam.teamName}
                </span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Passkey:</span>
                <code className="font-mono text-sm bg-secondary px-2 py-1 rounded border border-green-500/30 text-green-400">
                  {lastCreatedTeam.passkey}
                </code>
                <CopyButton
                  text={lastCreatedTeam.passkey}
                  label="Copy Passkey"
                />
                <span className="text-xs text-muted-foreground ml-2">
                  Budget: ₹
                  {(lastCreatedTeam.budgetRemaining / 10_000_000).toFixed(1)} Cr
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams List grouped by auction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-primary" />
            All Teams & Rooms ({teams.length} teams, {auctions.length} rooms)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auctions.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-8"
              data-ocid="rooms_teams.empty_state"
            >
              No auction rooms yet. Create one above.
            </p>
          ) : (
            <div className="space-y-6">
              {auctions.map((auction) => {
                const auctionTeams = teams.filter(
                  (t) => t.auctionId === auction.auctionId,
                );
                return (
                  <div key={auction.auctionId}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {auction.auctionName}
                        </span>
                        <code className="font-mono text-xs bg-cyan/10 text-cyan px-2 py-0.5 rounded border border-cyan/20">
                          {auction.roomKey}
                        </code>
                        <CopyButton text={auction.roomKey} label="Copy Key" />
                      </div>
                    </div>
                    {auctionTeams.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2 pb-2">
                        No teams in this room yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {auctionTeams.map((team, idx) => (
                          <div
                            key={team.teamId}
                            data-ocid={`rooms_teams.passkey.item.${idx + 1}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                          >
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {team.teamName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {team.teamId} · ₹
                                  {(team.budgetRemaining / 10_000_000).toFixed(
                                    1,
                                  )}{" "}
                                  Cr
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                                    (team.approvalStatus ?? "pending") ===
                                    "approved"
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : (team.approvalStatus ?? "pending") ===
                                          "rejected"
                                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }`}
                                >
                                  {team.approvalStatus ?? "pending"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm bg-secondary px-2 py-1 rounded border border-border text-green-400">
                                {team.passkey}
                              </code>
                              <CopyButton text={team.passkey} label="Copy" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Credentials Card */}
      <ExportCredentialsCard />
    </div>
  );
}

// ─── Export Credentials Card ──────────────────────────────────────────────────

function ExportCredentialsCard() {
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const code = exportCredentials();
    setExportCode(code);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!exportCode) return;
    await navigator.clipboard.writeText(exportCode);
    setCopied(true);
    toast.success("Export code copied! Share it with your teams.");
    setTimeout(() => setCopied(false), 3000);
  };

  const auctions = getAuctionRooms();
  const teams = getTeams();

  return (
    <Card className="border-cyan/20 bg-cyan/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="w-4 h-4 text-cyan" />
          Export Credentials for Cross-Device Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Teams joining from{" "}
          <span className="text-foreground font-medium">
            different devices or browsers
          </span>{" "}
          need this export code to load your auction data. Generate it and share
          it along with each team's passkey and the room key.
        </p>

        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">
              {auctions.length}
            </span>{" "}
            room
            {auctions.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-foreground font-semibold">
              {teams.length}
            </span>{" "}
            team
            {teams.length !== 1 ? "s" : ""} will be included in export
          </div>
          <Button
            data-ocid="rooms_teams.primary_button"
            onClick={handleExport}
            disabled={auctions.length === 0}
            className="gap-2 gradient-cyan-pink text-white font-semibold shrink-0"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Generate Export Code
          </Button>
        </div>

        {exportCode && (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                readOnly
                value={exportCode}
                rows={4}
                className="font-mono text-xs bg-background/60 border-cyan/20 resize-none pr-20 select-all"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <Button
                data-ocid="rooms_teams.copy_button"
                size="sm"
                onClick={handleCopy}
                className={`absolute top-2 right-2 gap-1.5 text-xs transition-all ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-yellow-400">
                📋 What to share with each team:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                <li>
                  The{" "}
                  <span className="text-foreground font-medium">Room Key</span>{" "}
                  (e.g. AUCTION-XXXX)
                </li>
                <li>
                  Their individual{" "}
                  <span className="text-foreground font-medium">
                    Team Passkey
                  </span>{" "}
                  (e.g. TEAM-XXXX)
                </li>
                <li>
                  This{" "}
                  <span className="text-cyan font-medium">Export Code</span>{" "}
                  (paste in Team Login → Import section)
                </li>
              </ol>
              <p className="text-xs text-muted-foreground pt-1">
                After you approve teams here, re-generate and re-share the
                export code so their approval status is updated.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const goToAuctionRoom = () => navigate({ to: "/admin/auction-room" });

  // On mount: push any existing localStorage data to backend so other devices can sync
  useEffect(() => {
    const engine = getAuctionEngine();
    const players = getLocalPlayers();
    const teams = getTeams();
    const rooms = getAuctionRooms();

    if (engine) syncEngineToBackend(engine);
    if (players.length > 0) syncPlayersToBackend(players);
    if (teams.length > 0) syncTeamsToBackend(teams);
    if (rooms.length > 0) syncRoomsToBackend(rooms);
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    queryClient.clear();
    void navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              IPL Auction Management
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Auction Room CTA */}
        <div className="mb-6 p-5 rounded-2xl border border-cyan/30 bg-gradient-to-r from-cyan/5 to-pink/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center border border-cyan/20">
                <Radio className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <p className="font-bold text-foreground">Auction Room</p>
                <p className="text-xs text-muted-foreground">
                  Live auction control panel
                </p>
              </div>
            </div>
            <Button
              data-ocid="admin_dashboard.primary_button"
              onClick={goToAuctionRoom}
              className="gradient-cyan-pink text-white font-semibold shrink-0 gap-2"
            >
              Go to Auction Room
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="rooms-teams">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger
              value="rooms-teams"
              data-ocid="rooms_teams.tab"
              className="gap-1.5"
            >
              <Key className="w-4 h-4" />
              Rooms &amp; Teams
            </TabsTrigger>
            <TabsTrigger value="players" data-ocid="admin_dashboard.tab">
              <Users className="w-4 h-4 mr-1.5" />
              Players
            </TabsTrigger>
            <TabsTrigger value="teams" data-ocid="admin_dashboard.tab">
              <UserCheck className="w-4 h-4 mr-1.5" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="auction" data-ocid="admin_dashboard.tab">
              <Gavel className="w-4 h-4 mr-1.5" />
              Auction
            </TabsTrigger>
            <TabsTrigger value="approvals" data-ocid="admin_dashboard.tab">
              <UserCheck className="w-4 h-4 mr-1.5" />
              ICP Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms-teams">
            <RoomsTeamsTab />
          </TabsContent>
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
      </div>
    </div>
  );
}
