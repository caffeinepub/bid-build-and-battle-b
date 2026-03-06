import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Loader2,
  Monitor,
  Shield,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import {
  type TeamLoginErrorCode,
  getAuctionRooms,
  getTeamSession,
  getTeams,
  saveTeamSession,
  validateTeamLogin,
} from "../lib/auctionStore";

// Maps error codes to user-facing messages and severity
const ERROR_CONFIG: Record<
  Exclude<TeamLoginErrorCode, "success">,
  { title: string; body: string; variant: "warning" | "destructive" }
> = {
  no_data: {
    title: "No auction data found in this browser",
    body: "This app stores all auction data locally on the device where the admin created the room. Make sure you're using the same browser and device as the host, or ask your host to set up the auction on this device.",
    variant: "warning",
  },
  wrong_passkey: {
    title: "Team passkey not found",
    body: "That passkey doesn't match any registered team. Double-check the passkey your host provided — it looks like TEAM-XXXX.",
    variant: "destructive",
  },
  wrong_room: {
    title: "Room key doesn't match",
    body: "Your passkey is valid but the room key doesn't match your team's auction. Make sure you're using the correct room key shared by your host.",
    variant: "destructive",
  },
};

export default function TeamLogin() {
  const navigate = useNavigate();

  const [roomKey, setRoomKey] = useState("");
  const [passkey, setPasskey] = useState("");
  const [errorCode, setErrorCode] = useState<Exclude<
    TeamLoginErrorCode,
    "success"
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    const session = getTeamSession();
    if (session) {
      void navigate({ to: "/team/dashboard" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);

    if (!roomKey.trim() || !passkey.trim()) {
      return;
    }

    setIsLoading(true);

    // Slight async delay for UX
    await new Promise((r) => setTimeout(r, 400));

    const result = validateTeamLogin(passkey, roomKey);

    if (result.error !== "success" || !result.session) {
      setErrorCode(result.error as Exclude<TeamLoginErrorCode, "success">);
      setIsLoading(false);
      // Auto-open diagnostics for the no_data case
      if (result.error === "no_data") {
        setDiagOpen(true);
      }
      return;
    }

    saveTeamSession(result.session);
    void navigate({ to: "/team/dashboard" });
  };

  // Live diagnostic counts
  const diagRooms = getAuctionRooms().length;
  const diagTeams = getTeams().length;

  const errorCfg = errorCode ? ERROR_CONFIG[errorCode] : null;

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

        {/* Same-device notice */}
        <div
          className="mb-4 flex items-start gap-3 rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3"
          data-ocid="team_login.section"
        >
          <Monitor className="w-4 h-4 text-cyan mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-cyan font-semibold">Note:</span> Your host
            must add you as a team from{" "}
            <span className="text-foreground font-medium">
              this same browser
            </span>
            . If they used a different device, the credentials won't work here.
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
            {/* Error block — warning style for no_data, destructive for others */}
            {errorCfg && errorCode === "no_data" && (
              <div
                data-ocid="team_login.error_state"
                className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-yellow-300">
                      {errorCfg.title}
                    </p>
                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                      {errorCfg.body}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errorCfg && errorCode !== "no_data" && (
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
              <div className="relative">
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
              </div>
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
              <div className="relative">
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
              </div>
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
              to receive your Room Key and Team Passkey.
            </p>
          </div>
        </div>

        {/* ── Collapsible Diagnostics ── */}
        <div className="mt-4">
          <button
            type="button"
            data-ocid="team_login.toggle"
            onClick={() => setDiagOpen((v) => !v)}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors group"
            aria-expanded={diagOpen}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Having trouble?
            {diagOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {diagOpen && (
            <div
              data-ocid="team_login.panel"
              className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3 animate-fade-in-up"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                Local Storage Diagnostics
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-background/60 border border-border/50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-cyan leading-none">
                    {diagRooms}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auction Room{diagRooms !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-lg bg-background/60 border border-border/50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-cyan leading-none">
                    {diagTeams}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Team{diagTeams !== 1 ? "s" : ""} Registered
                  </p>
                </div>
              </div>

              {diagRooms === 0 && diagTeams === 0 ? (
                <p className="text-xs text-yellow-300/80 leading-relaxed bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  ⚠ No data found. This browser has no auction data. The admin
                  must create the auction room and add teams on{" "}
                  <strong>this exact browser</strong> before you can log in.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {diagRooms > 0 && diagTeams > 0
                    ? `Found ${diagRooms} room${diagRooms !== 1 ? "s" : ""} and ${diagTeams} team${diagTeams !== 1 ? "s" : ""} — your credentials should work if they match exactly.`
                    : "Partial data found. Ask your host to verify the room and team were created on this browser."}
                </p>
              )}

              <p className="text-xs text-muted-foreground/60 border-t border-border/40 pt-3 leading-relaxed">
                Data is stored locally in this browser only. Credentials created
                on a different device or browser won't be visible here.
              </p>
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
