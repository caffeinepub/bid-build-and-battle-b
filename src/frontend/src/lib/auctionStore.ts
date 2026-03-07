// ─── Backend sync (lazy — imported here to avoid circular-dep issues) ─────────
// We use a registry pattern: backendSync.ts sets itself into this module.
// This avoids the circular: auctionStore → backendSync → backend → (ICP runtime)
// while still letting save functions push to backend fire-and-forget.

type BackendSyncFns = {
  syncEngineToBackend: (e: AuctionEngine) => void;
  syncTeamsToBackend: (t: TeamRecord[]) => void;
  syncPlayersToBackend: (p: LocalPlayer[]) => void;
  syncRoomsToBackend: (r: AuctionRoom[]) => void;
};

let _sync: BackendSyncFns | null = null;

/** Called once by backendSync.ts at module load time. */
export function registerBackendSync(fns: BackendSyncFns): void {
  _sync = fns;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuctionRoom {
  auctionId: string; // e.g. "A001"
  auctionName: string;
  roomKey: string; // e.g. "AUCTION-IPL2026"
  status: "waiting" | "live" | "paused" | "completed";
  createdAt: number;
}

export interface TeamRecord {
  teamId: string; // e.g. "T01"
  teamName: string;
  passkey: string; // e.g. "TEAM-A7F3"
  auctionId: string; // links to AuctionRoom.auctionId
  budgetRemaining: number; // in rupees
  playersBought: number;
  foreignPlayers: number;
  approvalStatus: "pending" | "approved" | "rejected"; // admin must approve before team can enter
}

export interface TeamSession {
  teamId: string;
  teamName: string;
  passkey: string;
  auctionId: string;
  auctionName: string;
  roomKey: string;
  budgetRemaining: number;
  playersBought: number;
  foreignPlayers: number;
  approvalStatus: "pending" | "approved" | "rejected";
  loggedInAt: number;
}

// ─── Auction Engine Types ─────────────────────────────────────────────────────

export interface BidRecord {
  id: string;
  teamId: string;
  teamName: string;
  playerName: string;
  amount: number; // in rupees
  timestamp: number; // Date.now()
}

export interface AuctionResult {
  playerId: string; // backend player ID as string
  playerName: string;
  soldToTeamId: string;
  soldToTeamName: string;
  amount: number;
  timestamp: number;
}

export interface AuctionEngineTeam {
  teamId: string;
  teamName: string;
  budgetRemaining: number;
  playersBought: number;
  foreignPlayers: number;
  squad: string[]; // player IDs won
}

export type AuctionEngineStatus = "waiting" | "live" | "paused" | "completed";

export interface AuctionEngine {
  status: AuctionEngineStatus;
  currentPlayerId: string | null; // backend player bigint ID as string
  currentPlayerBasePrice: number; // in rupees
  currentBid: number; // in rupees
  highestBidTeamId: string | null;
  highestBidTeamName: string | null;
  lastBidTimestamp: number; // Date.now() when last bid was placed or player became active
  playerQueue: string[]; // ordered player IDs (strings)
  bidHistory: BidRecord[]; // last 20
  teams: AuctionEngineTeam[];
  results: AuctionResult[];
  bidIncrement: number; // in rupees, default 1000000 (10L)
  maxSquadSize: number;
  maxForeignPlayers: number;
  timerDuration: number; // seconds, default 15
  bidProcessingLock: boolean;
  lastUpdated: number; // Date.now(), used by clients to detect changes
}

// ─── Local Player Types ───────────────────────────────────────────────────────

export type LocalPlayerRole =
  | "batsman"
  | "bowler"
  | "allRounder"
  | "wicketKeeper";
export type LocalPlayerCategory = "cappedIndian" | "uncappedIndian" | "foreign";
export type LocalPlayerStatus = "available" | "sold" | "unsold";

export interface LocalPlayer {
  id: string; // e.g. "P001"
  name: string;
  role: LocalPlayerRole;
  category: LocalPlayerCategory;
  basePrice: number; // in rupees
  country?: string; // e.g. "India", "Australia"
  stats?: string;
  photoUrl: string; // URL or data URL
  status: LocalPlayerStatus;
  soldToTeamId?: string;
  soldToTeamName?: string;
  soldPrice?: number;
  createdAt: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const AUCTIONS_KEY = "b3_auction_rooms";
const TEAMS_KEY = "b3_teams";
const TEAM_SESSION_KEY = "b3_team_session";
const AUCTION_ENGINE_KEY = "b3_auction_engine";
const PLAYERS_KEY = "b3_players";

// ─── Passkey / Room Key Generators ───────────────────────────────────────────

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

function generatePasskey(existingTeams: TeamRecord[]): string {
  const existing = new Set(existingTeams.map((t) => t.passkey));
  let passkey: string;
  do {
    passkey = `TEAM-${randomCode(4)}`;
  } while (existing.has(passkey));
  return passkey;
}

export function generateRoomKey(): string {
  return `AUCTION-${randomCode(4)}`;
}

// ─── Auction CRUD ─────────────────────────────────────────────────────────────

export function getAuctionRooms(): AuctionRoom[] {
  try {
    const raw = localStorage.getItem(AUCTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuctionRoom[];
  } catch {
    return [];
  }
}

export function saveAuctionRooms(auctions: AuctionRoom[]): void {
  localStorage.setItem(AUCTIONS_KEY, JSON.stringify(auctions));
  _sync?.syncRoomsToBackend(auctions);
}

export function addAuctionRoom(
  auction: Omit<AuctionRoom, "auctionId" | "createdAt">,
): AuctionRoom {
  const existing = getAuctionRooms();
  const nextId = existing.length + 1;
  const auctionId = `A${String(nextId).padStart(3, "0")}`;
  const newAuction: AuctionRoom = {
    ...auction,
    auctionId,
    createdAt: Date.now(),
  };
  saveAuctionRooms([...existing, newAuction]);
  return newAuction;
}

// ─── Team CRUD ────────────────────────────────────────────────────────────────

export function getTeams(): TeamRecord[] {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TeamRecord[];
  } catch {
    return [];
  }
}

export function saveTeams(teams: TeamRecord[]): void {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  // Broadcast team approval changes for cross-tab sync
  try {
    getBroadcastChannel()?.postMessage({ type: "TEAMS_UPDATE", teams });
  } catch {
    // ignore
  }
  _sync?.syncTeamsToBackend(teams);
}

export function approveTeamLocal(teamId: string): void {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.teamId === teamId);
  if (idx === -1) return;
  teams[idx] = { ...teams[idx], approvalStatus: "approved" };
  saveTeams(teams);
}

export function rejectTeamLocal(teamId: string): void {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.teamId === teamId);
  if (idx === -1) return;
  teams[idx] = { ...teams[idx], approvalStatus: "rejected" };
  saveTeams(teams);
}

export function addTeam(
  teamName: string,
  auctionId: string,
  budgetRemaining: number,
): TeamRecord {
  const existing = getTeams();
  const nextIndex = existing.length + 1;
  const teamId = `T${String(nextIndex).padStart(2, "0")}`;
  const passkey = generatePasskey(existing);
  const newTeam: TeamRecord = {
    teamId,
    teamName,
    passkey,
    auctionId,
    budgetRemaining,
    playersBought: 0,
    foreignPlayers: 0,
    approvalStatus: "pending", // Admin must approve before team can enter
  };
  saveTeams([...existing, newTeam]);

  // Also sync into AuctionEngine if one exists
  const engine = getAuctionEngine();
  if (engine) {
    const existingEngineTeam = engine.teams.find((t) => t.teamId === teamId);
    if (!existingEngineTeam) {
      const engineTeam: AuctionEngineTeam = {
        teamId,
        teamName,
        budgetRemaining,
        playersBought: 0,
        foreignPlayers: 0,
        squad: [],
      };
      engine.teams.push(engineTeam);
      engine.lastUpdated = Date.now();
      saveAuctionEngine(engine);
    }
  }

  return newTeam;
}

// ─── Team Login Validation ────────────────────────────────────────────────────

export type TeamLoginErrorCode =
  | "no_data"
  | "wrong_passkey"
  | "wrong_room"
  | "pending" // credentials valid but awaiting admin approval
  | "rejected" // admin rejected this team
  | "success";

export interface TeamLoginResult {
  session: TeamSession | null;
  error: TeamLoginErrorCode;
}

export function validateTeamLogin(
  passkey: string,
  roomKey: string,
): TeamLoginResult {
  const teams = getTeams();
  const auctions = getAuctionRooms();

  const normalizedPasskey = passkey.trim().toUpperCase();
  const normalizedRoomKey = roomKey.trim().toUpperCase();

  // No data at all in this browser
  if (teams.length === 0 && auctions.length === 0) {
    return { session: null, error: "no_data" };
  }

  const team = teams.find((t) => t.passkey === normalizedPasskey);
  if (!team) {
    return { session: null, error: "wrong_passkey" };
  }

  const auction = auctions.find(
    (a) =>
      a.roomKey.toUpperCase() === normalizedRoomKey &&
      a.auctionId === team.auctionId,
  );
  if (!auction) {
    return { session: null, error: "wrong_room" };
  }

  // Check approval status (backward compat: undefined defaults to "approved" for pre-existing teams)
  const approvalStatus = team.approvalStatus ?? "approved";

  if (approvalStatus === "rejected") {
    return { session: null, error: "rejected" };
  }

  // Build partial session for pending state (team name is needed for the UI)
  if (approvalStatus === "pending") {
    return {
      session: {
        teamId: team.teamId,
        teamName: team.teamName,
        passkey: team.passkey,
        auctionId: auction.auctionId,
        auctionName: auction.auctionName,
        roomKey: auction.roomKey,
        budgetRemaining: team.budgetRemaining,
        playersBought: team.playersBought,
        foreignPlayers: team.foreignPlayers,
        approvalStatus: "pending",
        loggedInAt: Date.now(),
      },
      error: "pending",
    };
  }

  // Refresh budget/squad from engine if engine exists
  let budgetRemaining = team.budgetRemaining;
  let playersBought = team.playersBought;
  let foreignPlayers = team.foreignPlayers;

  const engine = getAuctionEngine();
  if (engine) {
    const engineTeam = engine.teams.find((t) => t.teamId === team.teamId);
    if (engineTeam) {
      budgetRemaining = engineTeam.budgetRemaining;
      playersBought = engineTeam.playersBought;
      foreignPlayers = engineTeam.foreignPlayers;
    }
  }

  return {
    session: {
      teamId: team.teamId,
      teamName: team.teamName,
      passkey: team.passkey,
      auctionId: auction.auctionId,
      auctionName: auction.auctionName,
      roomKey: auction.roomKey,
      budgetRemaining,
      playersBought,
      foreignPlayers,
      approvalStatus: "approved",
      loggedInAt: Date.now(),
    },
    error: "success",
  };
}

// ─── Session Management ───────────────────────────────────────────────────────

export function saveTeamSession(session: TeamSession): void {
  localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(session));
}

export function getTeamSession(): TeamSession | null {
  try {
    const raw = localStorage.getItem(TEAM_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamSession;
  } catch {
    return null;
  }
}

export function clearTeamSession(): void {
  localStorage.removeItem(TEAM_SESSION_KEY);
}

// ─── Auction Engine CRUD ──────────────────────────────────────────────────────

export function getAuctionEngine(): AuctionEngine | null {
  try {
    const raw = localStorage.getItem(AUCTION_ENGINE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuctionEngine;
  } catch {
    return null;
  }
}

// BroadcastChannel for same-device cross-tab sync (instant, no 2s poll delay)
let _broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_broadcastChannel) {
    _broadcastChannel = new BroadcastChannel("b3_auction_engine");
  }
  return _broadcastChannel;
}

export function saveAuctionEngine(engine: AuctionEngine): void {
  localStorage.setItem(AUCTION_ENGINE_KEY, JSON.stringify(engine));
  // Broadcast to all tabs on the same device for instant sync
  try {
    getBroadcastChannel()?.postMessage({ type: "ENGINE_UPDATE", engine });
  } catch {
    // BroadcastChannel not available in all environments
  }
  _sync?.syncEngineToBackend(engine);
}

export function subscribeToEngineUpdates(
  callback: (engine: AuctionEngine) => void,
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "ENGINE_UPDATE" && event.data?.engine) {
      callback(event.data.engine as AuctionEngine);
    }
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}

export function subscribeToTeamUpdates(
  callback: (teams: TeamRecord[]) => void,
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "TEAMS_UPDATE" && event.data?.teams) {
      callback(event.data.teams as TeamRecord[]);
    }
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}

export function getDefaultAuctionEngine(): AuctionEngine {
  return {
    status: "waiting",
    currentPlayerId: null,
    currentPlayerBasePrice: 0,
    currentBid: 0,
    highestBidTeamId: null,
    highestBidTeamName: null,
    lastBidTimestamp: Date.now(),
    playerQueue: [],
    bidHistory: [],
    teams: [],
    results: [],
    bidIncrement: 1_000_000, // 10 Lakhs
    maxSquadSize: 25,
    maxForeignPlayers: 4,
    timerDuration: 60,
    bidProcessingLock: false,
    lastUpdated: Date.now(),
  };
}

export function initAuctionEngine(
  playerIds: string[],
  teams: AuctionEngineTeam[],
  bidIncrement: number,
  maxSquadSize: number,
  maxForeignPlayers: number,
  timerDuration = 60,
): void {
  const existing = getAuctionEngine();
  const engine: AuctionEngine = {
    status: "waiting",
    currentPlayerId: null,
    currentPlayerBasePrice: 0,
    currentBid: 0,
    highestBidTeamId: null,
    highestBidTeamName: null,
    lastBidTimestamp: Date.now(),
    playerQueue: [...playerIds],
    bidHistory: existing?.bidHistory ?? [],
    teams,
    results: existing?.results ?? [],
    bidIncrement,
    maxSquadSize,
    maxForeignPlayers,
    timerDuration,
    bidProcessingLock: false,
    lastUpdated: Date.now(),
  };
  saveAuctionEngine(engine);
}

export function startAuctionEngine(
  playerBasePrice: number,
  playerName: string,
): void {
  const engine = getAuctionEngine();
  if (!engine) return;
  if (engine.playerQueue.length === 0) return;

  const firstPlayerId = engine.playerQueue[0];
  const updatedEngine = activateNextPlayer(
    { ...engine, status: "live" },
    firstPlayerId,
    playerBasePrice,
    playerName,
  );
  saveAuctionEngine(updatedEngine);
}

export function pauseAuctionEngine(): void {
  const engine = getAuctionEngine();
  if (!engine) return;
  engine.status = "paused";
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}

export function resumeAuctionEngine(): void {
  const engine = getAuctionEngine();
  if (!engine) return;
  engine.status = "live";
  // Reset lastBidTimestamp so timer continues from where it left off (reset to now)
  engine.lastBidTimestamp = Date.now();
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}

export function skipCurrentPlayer(): void {
  const engine = getAuctionEngine();
  if (!engine || !engine.currentPlayerId) return;

  // Move current player to end of queue
  const remaining = engine.playerQueue.filter(
    (id) => id !== engine.currentPlayerId,
  );
  const newQueue = [...remaining, engine.currentPlayerId];

  engine.playerQueue = newQueue;
  engine.currentPlayerId = null;
  engine.currentBid = 0;
  engine.highestBidTeamId = null;
  engine.highestBidTeamName = null;
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}

export function forceSellCurrentPlayer(): void {
  const engine = getAuctionEngine();
  if (!engine || !engine.currentPlayerId) return;

  // Find the current player name from bid history
  const playerName =
    engine.bidHistory.find((b) => b.playerName)?.playerName ?? "Unknown Player";

  const resolvedEngine = resolveCurrentPlayer(engine, playerName);
  saveAuctionEngine(resolvedEngine);
}

export function endAuctionEngine(): void {
  const engine = getAuctionEngine();
  if (!engine) return;
  engine.status = "completed";
  engine.currentPlayerId = null;
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}

export function placeBidInEngine(
  teamId: string,
  playerCategory: string,
): { success: boolean; error?: string } {
  const engine = getAuctionEngine();
  if (!engine)
    return { success: false, error: "Auction engine not initialized" };

  // Race condition protection
  if (engine.bidProcessingLock) {
    return { success: false, error: "Another bid is being processed" };
  }

  if (engine.status !== "live") {
    return {
      success: false,
      error:
        engine.status === "paused"
          ? "Auction is paused"
          : "Auction is not live",
    };
  }

  if (!engine.currentPlayerId) {
    return { success: false, error: "No player is currently on auction" };
  }

  // Find team
  const team = engine.teams.find((t) => t.teamId === teamId);
  if (!team) {
    return {
      success: false,
      error: "Your team is not registered in this auction",
    };
  }

  const nextBid = engine.currentBid + engine.bidIncrement;

  // Validate budget
  if (team.budgetRemaining < nextBid) {
    return {
      success: false,
      error: `Insufficient budget. Need ₹${(nextBid / 100_000).toFixed(0)}L, have ₹${(team.budgetRemaining / 100_000).toFixed(0)}L`,
    };
  }

  // Validate squad size
  if (team.playersBought >= engine.maxSquadSize) {
    return {
      success: false,
      error: `Squad is full (max ${engine.maxSquadSize} players)`,
    };
  }

  // Validate foreign player limit
  const isOverseas =
    playerCategory === "foreign" || playerCategory === "overseas";
  if (isOverseas && team.foreignPlayers >= engine.maxForeignPlayers) {
    return {
      success: false,
      error: `Foreign player limit reached (max ${engine.maxForeignPlayers})`,
    };
  }

  // Lock and process bid
  engine.bidProcessingLock = true;

  // Get player name from most recent bid history, fall back to "Current Player"
  const playerName =
    engine.bidHistory.find((b) => b.playerName)?.playerName ?? "Current Player";

  const bidRecord: BidRecord = {
    id: `${teamId}-${Date.now()}`,
    teamId,
    teamName: team.teamName,
    playerName,
    amount: nextBid,
    timestamp: Date.now(),
  };

  engine.currentBid = nextBid;
  engine.highestBidTeamId = teamId;
  engine.highestBidTeamName = team.teamName;
  engine.lastBidTimestamp = Date.now();
  engine.bidHistory = [bidRecord, ...engine.bidHistory].slice(0, 20);
  engine.bidProcessingLock = false;
  engine.lastUpdated = Date.now();

  saveAuctionEngine(engine);

  console.log(
    `[B³ Engine] newBidPlaced — ${team.teamName} bid ₹${(nextBid / 100_000).toFixed(0)}L`,
  );

  return { success: true };
}

export function getTimerSecondsRemaining(engine: AuctionEngine): number {
  const duration = engine.timerDuration ?? 15;
  if (engine.status !== "live") return duration;
  return Math.max(
    0,
    duration - Math.floor((Date.now() - engine.lastBidTimestamp) / 1000),
  );
}

export function resolveCurrentPlayer(
  engine: AuctionEngine,
  playerName: string,
): AuctionEngine {
  const updated = { ...engine };

  if (updated.highestBidTeamId && updated.highestBidTeamName) {
    // SOLD
    const teamIdx = updated.teams.findIndex(
      (t) => t.teamId === updated.highestBidTeamId,
    );
    if (teamIdx !== -1) {
      const team = { ...updated.teams[teamIdx] };
      team.budgetRemaining -= updated.currentBid;
      team.playersBought += 1;

      // Add player to squad
      if (updated.currentPlayerId) {
        team.squad = [...team.squad, updated.currentPlayerId];
      }

      const newTeams = [...updated.teams];
      newTeams[teamIdx] = team;
      updated.teams = newTeams;

      // Also update team record in localStorage
      const teams = getTeams();
      const teamRecordIdx = teams.findIndex(
        (t) => t.teamId === updated.highestBidTeamId,
      );
      if (teamRecordIdx !== -1) {
        teams[teamRecordIdx] = {
          ...teams[teamRecordIdx],
          budgetRemaining: team.budgetRemaining,
          playersBought: team.playersBought,
          foreignPlayers: team.foreignPlayers,
        };
        saveTeams(teams);
      }

      // Record result
      const result: AuctionResult = {
        playerId: updated.currentPlayerId ?? "",
        playerName,
        soldToTeamId: updated.highestBidTeamId,
        soldToTeamName: updated.highestBidTeamName,
        amount: updated.currentBid,
        timestamp: Date.now(),
      };
      updated.results = [...updated.results, result];

      console.log(
        `[B³ Engine] playerSold — ${playerName} to ${updated.highestBidTeamName} for ₹${(updated.currentBid / 100_000).toFixed(0)}L`,
      );
    }
  } else {
    // UNSOLD
    console.log(`[B³ Engine] playerUnsold — ${playerName}`);
  }

  // Remove current player from queue
  updated.playerQueue = updated.playerQueue.filter(
    (id) => id !== updated.currentPlayerId,
  );
  updated.currentPlayerId = null;
  updated.currentBid = 0;
  updated.highestBidTeamId = null;
  updated.highestBidTeamName = null;
  updated.lastUpdated = Date.now();

  return updated;
}

export function activateNextPlayer(
  engine: AuctionEngine,
  nextPlayerId: string,
  basePrice: number,
  playerName: string,
): AuctionEngine {
  const updated = { ...engine };
  updated.currentPlayerId = nextPlayerId;
  updated.currentPlayerBasePrice = basePrice;
  updated.currentBid = basePrice;
  updated.highestBidTeamId = null;
  updated.highestBidTeamName = null;
  updated.lastBidTimestamp = Date.now();
  updated.lastUpdated = Date.now();

  // Seed bid history with the player name so it can be referenced later
  // We add a sentinel entry that records which player is active (not a real bid)
  // Actually store in a separate field would be cleaner, but we use a special entry
  // that won't appear in the feed (amount = 0 won't be shown)
  // Better: just ensure bidHistory is reset for the new player context
  // Keep existing history for full context but note: we clear per-player in UI

  console.log(
    `[B³ Engine] playerActivated — ${playerName} (base ₹${(basePrice / 100_000).toFixed(0)}L)`,
  );

  return updated;
}

// ─── Local Player CRUD ────────────────────────────────────────────────────────

export function getLocalPlayers(): LocalPlayer[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalPlayer[];
  } catch {
    return [];
  }
}

export function saveLocalPlayers(players: LocalPlayer[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  _sync?.syncPlayersToBackend(players);
}

export function addLocalPlayer(
  player: Omit<LocalPlayer, "id" | "status" | "createdAt">,
): LocalPlayer {
  const existing = getLocalPlayers();
  const nextIndex = existing.length + 1;
  const id = `P${String(nextIndex).padStart(3, "0")}`;
  const newPlayer: LocalPlayer = {
    ...player,
    id,
    status: "available",
    createdAt: Date.now(),
  };
  saveLocalPlayers([...existing, newPlayer]);
  return newPlayer;
}

export function deleteLocalPlayer(id: string): void {
  const existing = getLocalPlayers();
  saveLocalPlayers(existing.filter((p) => p.id !== id));
  // Also remove from engine queue if present
  const engine = getAuctionEngine();
  if (engine && engine.status === "waiting") {
    engine.playerQueue = engine.playerQueue.filter((qid) => qid !== id);
    engine.lastUpdated = Date.now();
    saveAuctionEngine(engine);
  }
}

export function updateLocalPlayerStatus(
  id: string,
  status: LocalPlayerStatus,
  soldToTeamId?: string,
  soldToTeamName?: string,
  soldPrice?: number,
): void {
  const players = getLocalPlayers();
  const idx = players.findIndex((p) => p.id === id);
  if (idx === -1) return;
  players[idx] = {
    ...players[idx],
    status,
    soldToTeamId,
    soldToTeamName,
    soldPrice,
  };
  saveLocalPlayers(players);
}

export function reAuctionCurrentPlayer(): void {
  const engine = getAuctionEngine();
  if (!engine || !engine.currentPlayerId) return;
  // Reset bid to base price, clear highest bidder, restart timer
  engine.currentBid = engine.currentPlayerBasePrice;
  engine.highestBidTeamId = null;
  engine.highestBidTeamName = null;
  engine.lastBidTimestamp = Date.now();
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}

// ─── Reset / New Auction ─────────────────────────────────────────────────────

/**
 * Full reset: wipes the auction engine, all local players, teams, and auction
 * rooms so the admin can start a brand-new auction from scratch.
 */
export function resetAllAuctionData(): void {
  localStorage.removeItem(AUCTION_ENGINE_KEY);
  localStorage.removeItem(PLAYERS_KEY);
  localStorage.removeItem(TEAMS_KEY);
  localStorage.removeItem(AUCTIONS_KEY);
  localStorage.removeItem(TEAM_SESSION_KEY);
}

/**
 * Soft reset: keeps rooms & teams but wipes the engine state and player
 * statuses so the same teams can run another auction with fresh players.
 */
export function resetAuctionEngineOnly(): void {
  localStorage.removeItem(AUCTION_ENGINE_KEY);
  // Reset player statuses to "available"
  const players = getLocalPlayers();
  const reset = players.map((p) => ({
    ...p,
    status: "available" as LocalPlayerStatus,
    soldToTeamId: undefined,
    soldToTeamName: undefined,
    soldPrice: undefined,
  }));
  saveLocalPlayers(reset);
  // Reset team budgets and squad counts
  const teams = getTeams();
  const resetTeams = teams.map((t) => ({
    ...t,
    playersBought: 0,
    foreignPlayers: 0,
  }));
  saveTeams(resetTeams);
}

export function updateLocalPlayer(
  id: string,
  updates: Partial<
    Pick<LocalPlayer, "name" | "country" | "role" | "basePrice">
  >,
): void {
  const players = getLocalPlayers();
  const idx = players.findIndex((p) => p.id === id);
  if (idx === -1) return;
  players[idx] = { ...players[idx], ...updates };
  saveLocalPlayers(players);
}

// Helper: sync a team's data into the engine when admin adds them
export function syncTeamToEngine(
  teamId: string,
  teamName: string,
  budgetRemaining: number,
): void {
  const engine = getAuctionEngine();
  if (!engine) return;

  const existingIdx = engine.teams.findIndex((t) => t.teamId === teamId);
  if (existingIdx === -1) {
    engine.teams.push({
      teamId,
      teamName,
      budgetRemaining,
      playersBought: 0,
      foreignPlayers: 0,
      squad: [],
    });
  } else {
    // Only update name and budget if not yet started
    if (engine.status === "waiting") {
      engine.teams[existingIdx].teamName = teamName;
      engine.teams[existingIdx].budgetRemaining = budgetRemaining;
    }
  }
  engine.lastUpdated = Date.now();
  saveAuctionEngine(engine);
}
