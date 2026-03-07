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
  HelpCircle,
  Loader2,
  RefreshCw,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type TeamLoginErrorCode,
  type TeamSession,
  getTeams,
  saveAuctionRooms,
  saveTeamSession,
  saveTeams,
  subscribeToTeamUpdates,
  validateTeamLogin,
} from "../lib/auctionStore";
import {
  fetchRoomsFromBackend,
  fetchTeamsFromBackend,
} from "../lib/backendSync";
import { importCredentials } from "../lib/sessionExport";

// ─── Error messages ────────────────────────────────────────────────────────────

const ERROR_CONFIG: Record<
  Exclude<TeamLoginErrorCode, "success" | "pending" | "rejected">,
  { title: string; body: string }
> = {
  no_data: {
    title: "Auction data not found",
    body: "We couldn't find any auction data. Your host needs to share the Room Key and Team Passkey. If the admin is using a different device, ask them to click 'Export Credentials' in their dashboard and share the code with you.",
  },
  wrong_passkey: {
    title: "Team not found",
    body: "That passkey doesn't match any team in this room. Make sure you're using the exact passkey your host gave you (format: TEAM-XXXX). If you're on a new device, use 'Having trouble?' below to import credentials.",
  },
  wrong_room: {
    title: "Wrong room key",
    body: "Your passkey is valid but the room key doesn't match. Make sure you copied the full Room Key (format: AUCTION-XXXX) from your host.",
  },
};

// ─── Cricket dot pattern background ────────────────────────────────────────────

function CricketBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Atmospheric glow blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] rounded-full opacity-[0.07] blur-[80px] bg-cyan" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[70px] bg-pink" />
      <div
        className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[60px]"
        style={{ background: "oklch(var(--gold))" }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.78 0.18 195) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Faint cricket ball seam lines — purely decorative */}
      <svg
        className="absolute bottom-8 right-8 w-40 h-40 opacity-[0.04]"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="80"
          cy="80"
          r="74"
          stroke="currentColor"
          strokeWidth="3"
          className="text-foreground"
        />
        <path
          d="M30 80 Q80 30 130 80 Q80 130 30 80Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-foreground"
        />
      </svg>
    </div>
  );
}

// ─── Step badge ─────────────────────────────────────────────────────────────────

function StepBadge({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan/20 border border-cyan/40 text-cyan text-xs font-bold flex items-center justify-center">
        {num}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Awaiting Approval Screen ───────────────────────────────────────────────────

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
            Pending approval
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Auto-checking every 5 seconds. You'll be redirected automatically once
        the admin approves your team.
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
          Check Status
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

// ─── Rejected Screen ────────────────────────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function TeamLogin() {
  const navigate = useNavigate();

  const [roomKey, setRoomKey] = useState("");
  const [passkey, setPasskey] = useState("");
  const [errorCode, setErrorCode] = useState<Exclude<
    TeamLoginErrorCode,
    "success" | "pending" | "rejected"
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bgFetching, setBgFetching] = useState(false);

  // Approval flow state
  const [pendingSession, setPendingSession] = useState<TeamSession | null>(
    null,
  );
  const [isRejected, setIsRejected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // "Need help?" section (import code) — hidden by default
  const [helpOpen, setHelpOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importStatus, setImportStatus] = useState<
    | { success: true; message: string }
    | { success: false; message: string }
    | null
  >(null);
  const [isImporting, setIsImporting] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-poll for approval status when pending
  const checkApprovalStatus = useCallback(async () => {
    if (!pendingSession) return;

    let teams = getTeams();
    let team = teams.find((t) => t.passkey === pendingSession.passkey);

    try {
      const backendTeams = await fetchTeamsFromBackend();
      // Save unconditionally (not null) — overwrite stale local data
      if (backendTeams !== null) {
        saveTeams(backendTeams);
        teams = backendTeams;
        team = backendTeams.find((t) => t.passkey === pendingSession.passkey);
      }
    } catch {
      // Backend unavailable — fall back to local data
    }

    if (!team) return;

    const status = team.approvalStatus ?? "pending";

    if (status === "approved") {
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

  // Poll every 5s when pending
  useEffect(() => {
    if (!pendingSession) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      void checkApprovalStatus();
    }, 5000);

    const unsubscribe = subscribeToTeamUpdates(() => {
      void checkApprovalStatus();
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      unsubscribe();
    };
  }, [pendingSession, checkApprovalStatus]);

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
    setBgFetching(true);

    // Always fetch from backend first — ensures cross-device login works.
    // Save unconditionally (overwrite stale localStorage) whenever the value
    // is not null. An empty array [] is valid and should still overwrite local data.
    try {
      const [backendTeams, backendRooms] = await Promise.all([
        fetchTeamsFromBackend(),
        fetchRoomsFromBackend(),
      ]);

      if (backendTeams !== null) {
        saveTeams(backendTeams);
      }
      if (backendRooms !== null) {
        saveAuctionRooms(backendRooms);
      }
    } catch {
      // Backend unavailable — fall through to local data
    } finally {
      setBgFetching(false);
    }

    const result = validateTeamLogin(
      passkey.trim().toUpperCase(),
      roomKey.trim().toUpperCase(),
    );

    if (result.error === "pending" && result.session) {
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
        setHelpOpen(true);
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
    await checkApprovalStatus();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    setPendingSession(null);
    setIsRejected(false);
    setErrorCode(null);
  };

  const errorCfg = errorCode ? ERROR_CONFIG[errorCode] : null;

  // ── Pending state ────────────────────────────────────────────────────────────
  if (pendingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <CricketBackground />
        <div className="relative w-full max-w-md">
          <BrandHeader />
          <AwaitingApprovalScreen
            teamName={pendingSession.teamName}
            passkey={pendingSession.passkey}
            roomKey={pendingSession.roomKey}
            onRefresh={handleManualRefresh}
            onLogout={handleLogout}
            isRefreshing={isRefreshing}
          />
          <FooterCredit />
        </div>
      </div>
    );
  }

  // ── Rejected state ───────────────────────────────────────────────────────────
  if (isRejected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <CricketBackground />
        <div className="relative w-full max-w-md">
          <BrandHeader />
          <RejectedScreen onLogout={handleLogout} />
          <FooterCredit />
        </div>
      </div>
    );
  }

  // ── Normal login form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <CricketBackground />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <BrandHeader />

        {/* "How it works" info strip */}
        <div className="mb-5 rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3 flex items-start gap-3">
          <Users className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-cyan">How to join</p>
            <div className="space-y-1">
              <StepBadge
                num="1"
                label="Get your Room Key from the host  (AUCTION-XXXX)"
              />
              <StepBadge
                num="2"
                label="Get your Team Passkey from the host  (TEAM-XXXX)"
              />
              <StepBadge
                num="3"
                label="Enter both below and tap Join Auction"
              />
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="card-navy rounded-2xl p-7 sm:p-8 border border-border shadow-2xl">
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                Team Login
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your auction credentials to join
              </p>
            </div>
          </div>

          {/* Error state */}
          {errorCfg && (
            <Alert
              variant="destructive"
              data-ocid="team_login.error_state"
              className="mb-5 border-destructive/40 bg-destructive/8 rounded-xl"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold block mb-0.5">
                  {errorCfg.title}
                </span>
                <span className="text-xs opacity-90 leading-relaxed">
                  {errorCfg.body}
                </span>
                {(errorCode === "wrong_passkey" ||
                  errorCode === "wrong_room") && (
                  <span className="block text-xs opacity-75 mt-1.5">
                    First time on this device? Tap{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:opacity-100"
                      onClick={() => setHelpOpen(true)}
                    >
                      'Having trouble?'
                    </button>{" "}
                    below to import credentials from your host.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Room Key field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="roomKey"
                className="text-sm font-semibold text-foreground"
              >
                Auction Room Key
              </Label>
              <Input
                id="roomKey"
                data-ocid="team_login.input"
                value={roomKey}
                onChange={(e) => {
                  setRoomKey(e.target.value.toUpperCase());
                  setErrorCode(null);
                }}
                placeholder="AUCTION-XXXX"
                className="font-mono tracking-widest text-base uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/40 bg-input/50 border-border/70 focus:border-cyan h-12 rounded-xl"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground pl-0.5">
                Shared by your auction host
              </p>
            </div>

            {/* Passkey field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="passkey"
                className="text-sm font-semibold text-foreground"
              >
                Your Team Passkey
              </Label>
              <Input
                id="passkey"
                data-ocid="team_login.passkey_input"
                value={passkey}
                onChange={(e) => {
                  setPasskey(e.target.value.toUpperCase());
                  setErrorCode(null);
                }}
                placeholder="TEAM-XXXX"
                className="font-mono tracking-widest text-base uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/40 bg-input/50 border-border/70 focus:border-cyan h-12 rounded-xl"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground pl-0.5">
                Unique to your team — provided by the admin
              </p>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              data-ocid="team_login.submit_button"
              disabled={isLoading || !roomKey.trim() || !passkey.trim()}
              className="w-full h-14 text-base font-bold gradient-cyan-pink text-white hover:opacity-90 disabled:opacity-40 shadow-lg rounded-xl transition-all mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {bgFetching
                    ? "Connecting to auction server…"
                    : "Verifying credentials…"}
                </span>
              ) : (
                <span className="flex items-center gap-2.5">
                  <Zap className="w-5 h-5" />
                  Join Auction
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* "Need help?" collapsible — subtle, at the bottom */}
        <div className="mt-5">
          <button
            type="button"
            data-ocid="team_login.toggle"
            onClick={() => setHelpOpen((v) => !v)}
            aria-expanded={helpOpen}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Having trouble joining?</span>
            {helpOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {helpOpen && (
            <div
              data-ocid="team_login.panel"
              className="mt-3 rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-4"
            >
              <div className="flex items-start gap-2.5">
                <Download className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Import Session Code
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If this is your first time on this device, ask your host for
                    the{" "}
                    <span className="text-cyan font-medium">Export Code</span>{" "}
                    (Dashboard → Rooms &amp; Teams → Export Credentials) and
                    paste it below. This loads the auction data onto your device
                    so you can log in.
                  </p>
                </div>
              </div>

              <Textarea
                data-ocid="team_login.textarea"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value);
                  setImportStatus(null);
                }}
                placeholder="Paste the base64 export code here…"
                rows={4}
                className="font-mono text-xs bg-background/60 border-border/60 resize-none rounded-lg"
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
                className="gap-2 w-full"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Import &amp; Try Again
              </Button>
            </div>
          )}
        </div>

        <FooterCredit />
      </div>
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <div className="text-center mb-7">
      <div className="relative inline-block">
        <img
          src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
          alt="IPL Auction — Bid Build Battle"
          className="w-32 sm:w-40 h-auto object-contain mx-auto mb-4 animate-splash-in"
          style={{
            filter: "drop-shadow(0 0 16px oklch(0.82 0.18 85 / 0.32))",
          }}
        />
      </div>
      <h1 className="text-3xl font-bold text-gradient tracking-tight">B³</h1>
      <p className="text-xs text-muted-foreground mt-1 tracking-[0.2em] uppercase">
        Bid · Build · Battle
      </p>
    </div>
  );
}

function FooterCredit() {
  return (
    <p className="text-center text-xs text-muted-foreground/50 mt-7">
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
  );
}
