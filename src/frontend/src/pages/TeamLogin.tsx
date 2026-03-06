import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type TeamLoginErrorCode,
  type TeamSession,
  getTeams,
  saveTeamSession,
  subscribeToTeamUpdates,
  validateTeamLogin,
} from "../lib/auctionStore";
import { importCredentials } from "../lib/sessionExport";

// ─── Error messages for each error code ───────────────────────────────────────

const ERROR_CONFIG: Record<
  Exclude<TeamLoginErrorCode, "success" | "pending" | "rejected">,
  { title: string; body: string }
> = {
  no_data: {
    title: "No auction data found",
    body: "Your admin hasn't shared a session code yet, or you need to paste the import code below. Ask your host to export credentials and share them with you.",
  },
  wrong_passkey: {
    title: "Team passkey not found",
    body: "That passkey doesn't match any registered team. Double-check the passkey — it looks like TEAM-XXXX.",
  },
  wrong_room: {
    title: "Room key doesn't match",
    body: "Your passkey is valid but the room key is incorrect. Make sure you're using the correct room key from your host.",
  },
};

// ─── Awaiting Approval Screen ─────────────────────────────────────────────────

function AwaitingApprovalScreen({
  teamName,
  passkey,
  roomKey,
  onRefresh,
  onLogout,
  isRefreshing,
}: {
  teamName: string;
  passkey: string;
  roomKey: string;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div
      data-ocid="team_login.panel"
      className="card-navy rounded-2xl p-8 border border-yellow-500/30 shadow-2xl text-center space-y-5"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 mx-auto">
        <Clock className="w-8 h-8 text-yellow-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Awaiting Admin Approval
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your team{" "}
          <span className="text-yellow-400 font-semibold">"{teamName}"</span>{" "}
          has been verified. The admin must approve your team before you can
          enter the auction.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-left space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Team Passkey</span>
          <span className="font-mono font-bold text-yellow-400">{passkey}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Room Key</span>
          <span className="font-mono font-bold text-cyan">{roomKey}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className="text-yellow-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Pending
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Auto-checking every 5 seconds. Your page will redirect automatically
        once the admin approves your team.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          data-ocid="team_login.secondary_button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh Status
        </Button>
        <Button
          data-ocid="team_login.cancel_button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <XCircle className="w-4 h-4" />
          Back to Login
        </Button>
      </div>
    </div>
  );
}

// ─── Rejected Screen ──────────────────────────────────────────────────────────

function RejectedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      data-ocid="team_login.error_state"
      className="card-navy rounded-2xl p-8 border border-red-500/30 shadow-2xl text-center space-y-5"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 mx-auto">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your team has been rejected by the admin. Please contact your auction
          host to get your access restored.
        </p>
      </div>
      <Button
        data-ocid="team_login.primary_button"
        variant="outline"
        onClick={onLogout}
        className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
      >
        <XCircle className="w-4 h-4" />
        Back to Login
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamLogin() {
  const navigate = useNavigate();

  const [roomKey, setRoomKey] = useState("");
  const [passkey, setPasskey] = useState("");
  const [errorCode, setErrorCode] = useState<Exclude<
    TeamLoginErrorCode,
    "success" | "pending" | "rejected"
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Approval flow state
  const [pendingSession, setPendingSession] = useState<TeamSession | null>(
    null,
  );
  const [isRejected, setIsRejected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Import code section
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importStatus, setImportStatus] = useState<
    | { success: true; message: string }
    | { success: false; message: string }
    | null
  >(null);
  const [isImporting, setIsImporting] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If already fully logged in (approved), redirect to dashboard
  useEffect(() => {
    // Don't redirect if we're in pending/rejected state
    if (pendingSession || isRejected) return;
  }, [pendingSession, isRejected]);

  // Auto-poll for approval status when pending
  const checkApprovalStatus = useCallback(() => {
    if (!pendingSession) return;

    const teams = getTeams();
    const team = teams.find((t) => t.passkey === pendingSession.passkey);
    if (!team) return;

    const status = team.approvalStatus ?? "pending";

    if (status === "approved") {
      // Redirect to dashboard
      const updatedSession = {
        ...pendingSession,
        approvalStatus: "approved" as const,
      };
      saveTeamSession(updatedSession);
      setPendingSession(null);
      void navigate({ to: "/team/dashboard" });
    } else if (status === "rejected") {
      setPendingSession(null);
      setIsRejected(true);
    }
  }, [pendingSession, navigate]);

  // Set up polling when in pending state
  useEffect(() => {
    if (!pendingSession) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(checkApprovalStatus, 5000);

    // Also subscribe to BroadcastChannel for instant same-device updates
    const unsubscribe = subscribeToTeamUpdates(() => {
      checkApprovalStatus();
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      unsubscribe();
    };
  }, [pendingSession, checkApprovalStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    setIsRejected(false);

    if (!roomKey.trim() || !passkey.trim()) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 350));

    const result = validateTeamLogin(passkey, roomKey);

    if (result.error === "pending" && result.session) {
      // Show pending screen — keep credentials in view
      setPendingSession(result.session);
      setIsLoading(false);
      return;
    }

    if (result.error === "rejected") {
      setIsRejected(true);
      setIsLoading(false);
      return;
    }

    if (result.error !== "success" || !result.session) {
      setErrorCode(
        result.error as Exclude<
          TeamLoginErrorCode,
          "success" | "pending" | "rejected"
        >,
      );
      setIsLoading(false);
      if (result.error === "no_data") {
        setImportOpen(true);
      }
      return;
    }

    saveTeamSession(result.session);
    void navigate({ to: "/team/dashboard" });
  };

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setIsImporting(true);
    await new Promise((r) => setTimeout(r, 300));

    const result = importCredentials(importCode);
    if (result.success) {
      setImportStatus({
        success: true,
        message: `Imported ${result.roomsImported ?? 0} room(s) and ${result.teamsImported ?? 0} new team(s). You can now log in.`,
      });
      setImportCode("");
      setErrorCode(null);
    } else {
      setImportStatus({
        success: false,
        message: result.error ?? "Import failed.",
      });
    }
    setIsImporting(false);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    checkApprovalStatus();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    setPendingSession(null);
    setIsRejected(false);
    setErrorCode(null);
  };

  const errorCfg = errorCode ? ERROR_CONFIG[errorCode] : null;

  // ── Pending state ──────────────────────────────────────────────────────────
  if (pendingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl bg-yellow-400" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl bg-pink" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gradient">B³</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
              Bid · Build · Battle
            </p>
          </div>
          <AwaitingApprovalScreen
            teamName={pendingSession.teamName}
            passkey={pendingSession.passkey}
            roomKey={pendingSession.roomKey}
            onRefresh={handleManualRefresh}
            onLogout={handleLogout}
            isRefreshing={isRefreshing}
          />
          {/* Re-import section on pending screen */}
          <div className="mt-4">
            <button
              type="button"
              data-ocid="team_login.toggle"
              onClick={() => setImportOpen((v) => !v)}
              className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Re-import credentials (if admin re-exported)
              {importOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {importOpen && (
              <div className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If your admin approved your team and re-exported credentials,
                  paste the new code here to update your status.
                </p>
                <Textarea
                  data-ocid="team_login.textarea"
                  value={importCode}
                  onChange={(e) => {
                    setImportCode(e.target.value);
                    setImportStatus(null);
                  }}
                  placeholder="Paste export code here..."
                  rows={3}
                  className="font-mono text-xs bg-background/60 border-border/60 resize-none"
                />
                {importStatus && (
                  <div
                    className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${importStatus.success ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}
                  >
                    {importStatus.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    {importStatus.message}
                  </div>
                )}
                <Button
                  data-ocid="team_login.submit_button"
                  size="sm"
                  onClick={handleImport}
                  disabled={!importCode.trim() || isImporting}
                  className="gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Import & Refresh
                </Button>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan transition-colors"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Rejected state ─────────────────────────────────────────────────────────
  if (isRejected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl bg-red-400/30" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gradient">B³</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
              Bid · Build · Battle
            </p>
          </div>
          <RejectedScreen onLogout={handleLogout} />
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan transition-colors"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Normal login form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Background glow accents */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl gradient-cyan-pink" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl bg-pink" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-cyan-pink mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">B³</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
            Bid · Build · Battle
          </p>
        </div>

        {/* Card */}
        <div className="card-navy rounded-2xl p-8 border border-border shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Team Login</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to join the auction
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error block */}
            {errorCfg && (
              <Alert
                variant="destructive"
                data-ocid="team_login.error_state"
                className="border-destructive/50 bg-destructive/10"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold block">{errorCfg.title}</span>
                  <span className="text-xs opacity-90">{errorCfg.body}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Room Key */}
            <div className="space-y-2">
              <Label
                htmlFor="roomKey"
                className="text-sm font-medium text-foreground"
              >
                Room Key
              </Label>
              <Input
                id="roomKey"
                data-ocid="team_login.input"
                value={roomKey}
                onChange={(e) => {
                  setRoomKey(e.target.value.toUpperCase());
                  setErrorCode(null);
                }}
                placeholder="e.g. AUCTION-IPL2026"
                className="font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal bg-input/50 border-border focus:border-primary h-11"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Provided by your auction host
              </p>
            </div>

            {/* Team Passkey */}
            <div className="space-y-2">
              <Label
                htmlFor="passkey"
                className="text-sm font-medium text-foreground"
              >
                Team Passkey
              </Label>
              <Input
                id="passkey"
                data-ocid="team_login.passkey_input"
                value={passkey}
                onChange={(e) => {
                  setPasskey(e.target.value.toUpperCase());
                  setErrorCode(null);
                }}
                placeholder="e.g. TEAM-A7F3"
                className="font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal bg-input/50 border-border focus:border-primary h-11"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Your unique team passkey assigned by the admin
              </p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              data-ocid="team_login.submit_button"
              disabled={isLoading || !roomKey.trim() || !passkey.trim()}
              className="w-full h-12 text-base font-bold gradient-cyan-pink text-white hover:opacity-90 disabled:opacity-50 shadow-lg transition-all rounded-xl mt-2"
              style={{ minHeight: "48px" }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Join Auction
                </span>
              )}
            </Button>
          </form>

          {/* Contact hint */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Don't have credentials?{" "}
              <span className="text-cyan font-medium">
                Contact your auction host
              </span>{" "}
              to receive your Room Key, Team Passkey, and Session Code.
            </p>
          </div>
        </div>

        {/* Import Session Code section */}
        <div className="mt-4">
          <button
            type="button"
            data-ocid="team_login.toggle"
            onClick={() => setImportOpen((v) => !v)}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors group"
            aria-expanded={importOpen}
          >
            <Download className="w-3.5 h-3.5" />
            First time on this device? Import session code
            {importOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {importOpen && (
            <div
              data-ocid="team_login.panel"
              className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Import Session Code
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If this is your first time on this device, ask your admin for
                  the <span className="text-cyan font-medium">Export Code</span>{" "}
                  from Dashboard → Rooms &amp; Teams → Export Credentials. Paste
                  it below to load your auction data.
                </p>
              </div>

              <Textarea
                data-ocid="team_login.textarea"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value);
                  setImportStatus(null);
                }}
                placeholder="Paste the base64 export code here..."
                rows={4}
                className="font-mono text-xs bg-background/60 border-border/60 resize-none"
              />

              {importStatus && (
                <div
                  className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                    importStatus.success
                      ? "bg-green-500/10 border-green-500/30 text-green-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  {importStatus.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  {importStatus.message}
                </div>
              )}

              <Button
                data-ocid="team_login.secondary_button"
                size="sm"
                onClick={handleImport}
                disabled={!importCode.trim() || isImporting}
                className="gap-2 w-full sm:w-auto"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Import Credentials
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
