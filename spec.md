# Bid Build and Battle (B³) — Phase 4

## Current State

The app is a full-stack IPL-style auction platform with:
- Admin login (passcode `sastra2026`)
- Room creation + team management (backend-synced via Motoko canister)
- Team passkey login from any device
- Admin approval flow
- Player management (add/edit/delete)
- Live auction engine: 3-column admin control panel, team dashboard with real-time bid feed
- Cross-device sync via 1-second polling + BroadcastChannel
- `timerDuration` stored in engine (default 60s), configurable at init
- `getTimerSecondsRemaining()` derives seconds from `lastBidTimestamp`
- Auto-resolution: `triggerResolutionIfExpired` called from AuctionRoom when `timerSeconds === 0`
- Bid notifications + animations already in place

**Current timer behavior:** A single `timerDuration` is used for both the initial player timer and the reset-on-bid timer. Default is 60s. Timer init form allows a custom value.

**No analytics panel exists anywhere.** No "Going Once / Going Twice / SOLD!" drama animation exists. No configurable initial-vs-reset timer split exists. No crash recovery loading screen exists.

## Requested Changes (Diff)

### Add

1. **Configurable timer** — Add two separate timer fields to `AuctionEngine` and the init form:
   - `initialTimerDuration` (default 15s): timer duration when a player first becomes active
   - `bidTimerDuration` (default 10s): timer duration after each bid
   - Timer setup UI in `InitializeAuctionForm`: clickable preset buttons `[10s] [15s] [20s] [30s] [60s]` for each field
   - `getTimerSecondsRemaining` updated to use `bidTimerDuration` for post-bid resets and `initialTimerDuration` for player activation

2. **"Going Once / Going Twice / SOLD!" drama overlay** — An animated overlay that triggers based on remaining seconds:
   - 5s left → "Going Once!" (yellow/amber)
   - 3s left → "Going Twice!" (orange)
   - 0s → "SOLD!" or "UNSOLD" (green/red) for 2 seconds
   - Shown in both AuctionRoom (admin) and TeamDashboard (teams)

3. **Last 5 seconds countdown highlight** — Timer ring/text pulses red + blinks when ≤ 5 seconds remain (already partially exists, enhance to match 5s threshold)

4. **Crash recovery loading screen** — On page load (AuctionRoom + TeamDashboard), show a full-screen loading overlay ("Restoring auction state...") while the initial backend fetch resolves, then fade out. Uses the existing `isLoading` concept but adds a proper timed screen.

5. **Auction Analytics Panel** — New `AuctionAnalyticsPanel` component shown:
   - **Admin** (in AuctionRoom right column, below bid history): full analytics
     - Most Expensive Player (name + team + price)
     - Total Auction Spend (sum of all results)
     - Average Player Price
     - Unsold Players count
     - Remaining Players count
     - Team Spending breakdown (sorted by spend, with budget bar)
   - **Teams + Spectators** (in TeamDashboard sidebar + WatchPage): basic analytics
     - Most Expensive Player
     - Total Auction Spend
     - Average Player Price

### Modify

- `AuctionEngine` type: add `initialTimerDuration` and `bidTimerDuration` fields (keep `timerDuration` as alias/fallback for backward compatibility)
- `getDefaultAuctionEngine()`: set `initialTimerDuration: 15`, `bidTimerDuration: 10`, `timerDuration: 15`
- `initAuctionEngine()`: accept `initialTimerDuration` and `bidTimerDuration` params
- `activateNextPlayer()`: sets `lastBidTimestamp` (timer uses `initialTimerDuration` from engine)
- `placeBidInEngine()`: after bid, timer uses `bidTimerDuration` (already resets `lastBidTimestamp`, engine fields drive the calculation)
- `getTimerSecondsRemaining()`: use `bidTimerDuration` if `highestBidTeamId` is set (bid has been placed), else use `initialTimerDuration`
- `InitializeAuctionForm`: replace single timer input with two preset-button rows
- `useAuctionEngine.initAuction()`: pass both timer values
- `AuctionTimer` component: add red pulse when ≤ 5s
- `AuctionRoom` center column: add drama overlay
- `TeamDashboard`: add drama overlay + basic analytics panel in sidebar
- `WatchPage`: add basic analytics panel

### Remove

- Nothing removed; `timerDuration` kept as backward-compat alias

## Implementation Plan

1. Update `AuctionEngine` type + defaults + store functions in `auctionStore.ts`
2. Update `getTimerSecondsRemaining` to branch on whether a bid has been placed
3. Update `useAuctionEngine` hook: pass both timer durations through `initAuction`
4. Update `InitializeAuctionForm` in `AuctionRoom.tsx`: two preset-button rows for initial/bid timer
5. Create `AuctionDramaOverlay` component: "Going Once / Going Twice / SOLD!" animation
6. Enhance `AuctionTimer` component: red pulse when ≤ 5s
7. Create `AuctionAnalyticsPanel` component with admin-full and basic variants
8. Add crash recovery loading screen to `AuctionRoom` and `TeamDashboard`
9. Integrate drama overlay into `AuctionRoom` (center column) and `TeamDashboard`
10. Add basic analytics to `TeamDashboard` sidebar and `WatchPage`
11. Add full analytics to `AuctionRoom` right column (below bid history)
