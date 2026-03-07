/**
 * backendSync.ts — Cross-device sync via the Motoko backend canister.
 *
 * All saves are fire-and-forget (non-blocking). Reads return null on failure.
 * The backend canister stores JSON blobs that all devices can read/write,
 * solving the localStorage isolation problem across different browsers/devices.
 *
 * This module self-registers with auctionStore so that every save function
 * automatically pushes state to the backend without extra call sites.
 */

import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import type {
  AuctionEngine,
  AuctionRoom,
  LocalPlayer,
  TeamRecord,
} from "./auctionStore";
import { registerBackendSync } from "./auctionStore";

// ─── Lazy anonymous actor ─────────────────────────────────────────────────────
// We use a single anonymous actor instance (no identity) for all sync calls.
// This works because the Motoko canister allows unauthenticated reads/writes
// for the shared state endpoints.

let _actorPromise: Promise<backendInterface> | null = null;

function getActor(): Promise<backendInterface> {
  if (!_actorPromise) {
    _actorPromise = createActorWithConfig().catch((err) => {
      // Reset on failure so next call tries again
      _actorPromise = null;
      throw err;
    });
  }
  return _actorPromise;
}

// ─── Fire-and-forget saves ────────────────────────────────────────────────────

/** Save auction engine state to backend (non-blocking). */
export function syncEngineToBackend(engine: AuctionEngine): void {
  try {
    const json = JSON.stringify(engine);
    getActor()
      .then((actor) => actor.saveSharedAuctionState(json))
      .catch(() => {
        // Silently ignore — backend may be unavailable
      });
  } catch {
    // Silently ignore serialization errors
  }
}

/** Save teams data to backend (non-blocking). */
export function syncTeamsToBackend(teams: TeamRecord[]): void {
  try {
    const json = JSON.stringify(teams);
    getActor()
      .then((actor) => actor.saveSharedTeamsData(json))
      .catch(() => {
        // Silently ignore
      });
  } catch {
    // Silently ignore
  }
}

/** Save players data to backend (non-blocking). */
export function syncPlayersToBackend(players: LocalPlayer[]): void {
  try {
    const json = JSON.stringify(players);
    getActor()
      .then((actor) => actor.saveSharedPlayersData(json))
      .catch(() => {
        // Silently ignore
      });
  } catch {
    // Silently ignore
  }
}

/** Save rooms data to backend (non-blocking). */
export function syncRoomsToBackend(rooms: AuctionRoom[]): void {
  try {
    const json = JSON.stringify(rooms);
    getActor()
      .then((actor) => actor.saveSharedRoomsData(json))
      .catch(() => {
        // Silently ignore
      });
  } catch {
    // Silently ignore
  }
}

// ─── Reads (with null fallback) ───────────────────────────────────────────────

/** Fetch auction engine state from backend. Returns null if unavailable. */
export async function fetchEngineFromBackend(): Promise<AuctionEngine | null> {
  try {
    const actor = await getActor();
    const json = await actor.getSharedAuctionState();
    if (!json || json.trim() === "" || json.trim() === "null") return null;
    const engine = JSON.parse(json) as AuctionEngine;
    // Validate it has the required shape
    if (typeof engine.lastUpdated !== "number") return null;
    return engine;
  } catch {
    return null;
  }
}

/** Fetch teams data from backend. Returns null if unavailable. */
export async function fetchTeamsFromBackend(): Promise<TeamRecord[] | null> {
  try {
    const actor = await getActor();
    const json = await actor.getSharedTeamsData();
    if (!json || json.trim() === "" || json.trim() === "null") return null;
    const teams = JSON.parse(json) as TeamRecord[];
    if (!Array.isArray(teams)) return null;
    return teams;
  } catch {
    return null;
  }
}

/** Fetch players data from backend. Returns null if unavailable. */
export async function fetchPlayersFromBackend(): Promise<LocalPlayer[] | null> {
  try {
    const actor = await getActor();
    const json = await actor.getSharedPlayersData();
    if (!json || json.trim() === "" || json.trim() === "null") return null;
    const players = JSON.parse(json) as LocalPlayer[];
    if (!Array.isArray(players)) return null;
    return players;
  } catch {
    return null;
  }
}

/** Fetch rooms data from backend. Returns null if unavailable. */
export async function fetchRoomsFromBackend(): Promise<AuctionRoom[] | null> {
  try {
    const actor = await getActor();
    const json = await actor.getSharedRoomsData();
    if (!json || json.trim() === "" || json.trim() === "null") return null;
    const rooms = JSON.parse(json) as AuctionRoom[];
    if (!Array.isArray(rooms)) return null;
    return rooms;
  } catch {
    return null;
  }
}

// ─── Full wipe: clear all shared backend state ───────────────────────────────

/**
 * Clears all shared data in the backend canister — engine, teams, players,
 * and rooms. Call this alongside localStorage.clear() when starting a
 * completely fresh auction so that other devices also see the wipe.
 */
export async function clearAllBackendData(): Promise<void> {
  try {
    const actor = await getActor();
    await Promise.allSettled([
      actor.saveSharedAuctionState("null"),
      actor.saveSharedTeamsData("[]"),
      actor.saveSharedPlayersData("[]"),
      actor.saveSharedRoomsData("[]"),
    ]);
  } catch {
    // Silently ignore — backend may be unavailable
  }
}

// ─── Self-register with auctionStore ─────────────────────────────────────────
// This runs once when this module is first imported. After registration, every
// call to saveAuctionEngine / saveTeams / saveLocalPlayers / saveAuctionRooms
// will automatically push state to the backend fire-and-forget.
registerBackendSync({
  syncEngineToBackend,
  syncTeamsToBackend,
  syncPlayersToBackend,
  syncRoomsToBackend,
});
