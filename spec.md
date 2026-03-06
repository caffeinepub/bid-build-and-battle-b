# Bid Build and Battle (B³)

## Current State

- Full IPL auction UI with admin login (passcode: sastra2026), auction room 3-column layout, player management, team passkey login, and a bidding engine.
- All data (teams, rooms, players, engine state) is stored in **browser localStorage** — meaning teams on different browsers/devices cannot log in or see shared state.
- Team login validates passkey + room key against localStorage only.
- Timer is set to 15 seconds (later configs use 15s default).
- No admin approval gate for teams — teams auto-login once passkey is valid.
- The AdminDashboard "Teams" tab uses backend canister hooks (useGetTeams, useApproveTeam) that are not aligned with the localStorage approach.

## Requested Changes (Diff)

### Add
- Motoko backend persistent storage for: auctions (rooms), teams (with approval status), players, bids, and auction engine state.
- Team approval workflow: teams register with auction code + team code, appear as "pending" until admin explicitly approves them. Approved teams can join; pending/rejected teams see a waiting screen.
- Multi-device support: all data reads/writes go through the Motoko canister so any browser on any IP can participate.
- Admin approval screen in AdminDashboard: list of pending teams with approve/reject buttons.
- "Awaiting approval" screen shown to teams whose status is pending.

### Modify
- `auctionStore.ts`: replace all localStorage reads/writes with canister API calls (async). Keep the same type shapes but source data from backend.
- `TeamLogin.tsx`: after validating credentials against backend, check approval status. Show "Awaiting host approval" if pending, show error if rejected, proceed to dashboard if approved.
- `AdminDashboard.tsx` Teams tab: wire to backend canister to list teams with pending/approved/rejected status and approve/reject buttons.
- `AuctionRoom.tsx` and `auctionStore.ts`: change default `timerDuration` from 15 to **60 seconds**.
- `getDefaultAuctionEngine()`: set `timerDuration: 60`.
- Remove the localhost/same-device warning banner from TeamLogin.

### Remove
- The diagnostic "Local Storage Diagnostics" panel from TeamLogin (no longer relevant once backend is used).
- The "Note: Your host must add you from this same browser" banner.

## Implementation Plan

1. **Backend (Motoko)**: Add persistent stable storage for `auctions`, `teams` (with `approvalStatus: "pending" | "approved" | "rejected"`), `players`, `bids`, and `auctionEngine` state. Expose functions: `createAuction`, `getAuction`, `listAuctions`, `registerTeam`, `getTeam`, `listTeams`, `approveTeam`, `rejectTeam`, `addPlayer`, `listPlayers`, `saveEngineState`, `getEngineState`, `placeBid`, `listBids`. Admin-only mutations gated by passcode check.

2. **auctionStore.ts**: Refactor to async functions that call the backend actor. Maintain same type contracts. Add `getTeamApprovalStatus(passkey, roomKey)` returning `"pending" | "approved" | "rejected" | "not_found"`.

3. **TeamLogin.tsx**: After successful credential verification, check approval status. Route: approved → dashboard, pending → awaiting approval screen, rejected → error. Remove same-device warning and localStorage diagnostics.

4. **AdminDashboard Teams tab**: Replace mock hooks with real backend calls. Show team list with Name, Passkey, Status, Approve/Reject buttons.

5. **AuctionRoom.tsx + auctionStore.ts**: Change all `timerDuration` defaults to 60. Update `getDefaultAuctionEngine()` to use 60.

6. **AppHeader / navigation**: Ensure all pages can be accessed cross-device without breaking.
