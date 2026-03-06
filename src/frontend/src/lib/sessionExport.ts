/**
 * sessionExport.ts — Credential export/import utilities for cross-device team login.
 *
 * Since all auction data lives in localStorage, teams on different devices need a
 * way to get the room + team credentials. The admin exports a base64-encoded JSON
 * blob containing all rooms and teams, which teams paste into the login page.
 *
 * On import, the data is MERGED (not overwritten) — so existing local data is preserved.
 */

import {
  type AuctionRoom,
  type TeamRecord,
  getAuctionRooms,
  getTeams,
  saveAuctionRooms,
  saveTeams,
} from "./auctionStore";

interface ExportPayload {
  rooms: AuctionRoom[];
  teams: TeamRecord[];
  exportedAt: number;
  version: 1;
}

/**
 * Serialize all rooms and teams into a compact base64 string.
 * Safe to share via chat, email, or QR code.
 */
export function exportCredentials(): string {
  const payload: ExportPayload = {
    rooms: getAuctionRooms(),
    teams: getTeams(),
    exportedAt: Date.now(),
    version: 1,
  };
  return btoa(JSON.stringify(payload));
}

export interface ImportResult {
  success: boolean;
  error?: string;
  roomsImported?: number;
  teamsImported?: number;
}

/**
 * Decode and merge a base64 export code into localStorage.
 * Existing entries are NOT overwritten — only new ones are added.
 * Returns counts of newly added items.
 */
export function importCredentials(code: string): ImportResult {
  if (!code.trim()) {
    return { success: false, error: "Export code is empty." };
  }

  let payload: ExportPayload;
  try {
    const decoded = atob(code.trim());
    payload = JSON.parse(decoded) as ExportPayload;
  } catch {
    return {
      success: false,
      error:
        "Invalid export code — could not decode. Make sure you copied the full code from your admin.",
    };
  }

  if (!payload.rooms || !payload.teams) {
    return {
      success: false,
      error: "Export code is malformed. Ask your admin to regenerate it.",
    };
  }

  // Merge rooms
  const existingRooms = getAuctionRooms();
  const mergedRooms = [...existingRooms];
  let roomsImported = 0;
  for (const room of payload.rooms) {
    if (!mergedRooms.some((r) => r.auctionId === room.auctionId)) {
      mergedRooms.push(room);
      roomsImported++;
    } else {
      // Update existing room to get latest approval states, status etc
      const idx = mergedRooms.findIndex((r) => r.auctionId === room.auctionId);
      if (idx !== -1) mergedRooms[idx] = { ...mergedRooms[idx], ...room };
    }
  }
  saveAuctionRooms(mergedRooms);

  // Merge teams — update approval status of existing teams too (so re-import after admin approves works)
  const existingTeams = getTeams();
  const mergedTeams = [...existingTeams];
  let teamsImported = 0;
  for (const team of payload.teams) {
    const existingIdx = mergedTeams.findIndex((t) => t.teamId === team.teamId);
    if (existingIdx === -1) {
      // New team — add with backward compat for approvalStatus
      mergedTeams.push({
        ...team,
        approvalStatus: team.approvalStatus ?? "pending",
      });
      teamsImported++;
    } else {
      // Update existing team — particularly approvalStatus so re-import after approval works
      mergedTeams[existingIdx] = {
        ...mergedTeams[existingIdx],
        ...team,
        approvalStatus:
          team.approvalStatus ??
          mergedTeams[existingIdx].approvalStatus ??
          "pending",
      };
    }
  }
  saveTeams(mergedTeams);

  return { success: true, roomsImported, teamsImported };
}
