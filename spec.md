# Bid Build and Battle (B³) — Phase 5

## Current State

The app is a full-stack IPL auction simulator on ICP (Motoko + React). It has:
- Admin login (passcode `sastra2026`), auction room, player management
- Team passkey login, cross-device backend sync via Motoko canister
- Live bidding engine with 60s timer, dual timer (initial + bid-reset), race condition protection
- Real-time bid notifications on all devices (polls every 2s)
- Phase 4: configurable dual timers, "Going Once/Twice/SOLD!" drama overlay, crash recovery, analytics panel (admin full / teams basic)
- Routes: `/`, `/admin/login`, `/admin/dashboard`, `/admin/auction-room`, `/team/login`, `/team/dashboard`, `/watch`, `/results`
- Components: AuctionAnalyticsPanel, AuctionDramaOverlay, AuctionTimer, B3Logo, BidButton, BidHighlight, AppHeader, TeamPanel, etc.
- Data: `auctionStore.ts` (localStorage + backend sync), `backendSync.ts`, `useAuctionEngine` hook

## Requested Changes (Diff)

### Add

1. **Live Leaderboard small panel** — inside AuctionRoom (right column) and TeamDashboard (right column sidebar), showing top 5 teams ranked by `totalSpent` (money spent). Columns: rank, team name, players bought, total spent. Gold/silver/bronze highlight for top 3. Updates from engine state every 2s poll.

2. **Dedicated `/leaderboard` page** — full leaderboard table visible to everyone (no login required). Columns: Rank | Team | Players | Total Spend | Budget Left | Avg Player Price. Sort by most spend. Top 3 teams highlighted with gold/silver/bronze. Accessible from AppHeader nav and from TeamDashboard.

3. **Team Squad pages** — route `/squad/:teamId`. Shows full squad for any team, visible to everyone (no login required). Displays: team name, player list (name, role, category, price paid), plus summary stats (total players, total spent, remaining budget, avg price). Back button. Accessible from Leaderboard page (click team name) and TeamDashboard (view squad link).

4. **Sound effects** — on by default, per-device mute toggle stored in `localStorage`. Four sounds generated as short Web Audio API tones (no external files needed):
   - Bid placed → short soft click (400Hz, 80ms)
   - New highest bid → stadium chime (C5 → E5 → G5 chord, 300ms)
   - Timer last 5 seconds → countdown beep (600Hz, 150ms each second)
   - Player sold → gavel strike (low thud + decay, 500ms)
   Sounds play on all pages where auctions are active (TeamDashboard, WatchPage, AuctionRoom).
   Sound toggle button in AppHeader: 🔊/🔇 icon, stored in `b3_sound_enabled` localStorage key.

5. **"SOLD!" full-screen animation** — when a player is sold, show a large overlay: "SOLD!", player name, winning team, final price. This already has `AuctionDramaOverlay` — extend it to show the sold overlay with player name + team + price when timer hits 0 and there's a highest bidder. Show for 3 seconds.

6. **CSV export** on ResultsPage — "Download Results CSV" button. Columns: Player, Team, Price (in rupees), Role, Category.

### Modify

- **AppHeader** — add `/leaderboard` nav link (Trophy icon) visible to everyone. Add sound toggle button (Volume2/VolumeX icon) that reads/writes `b3_sound_enabled` in localStorage.
- **AuctionRoom right column** — add LeaderboardMiniPanel above or below BidHistoryPanel.
- **TeamDashboard right sidebar** — add a small leaderboard mini-panel and a "View Full Leaderboard" link.
- **WatchPage** — add leaderboard mini-panel in the right column.
- **AuctionDramaOverlay** — extend SOLD drama to display player name, winning team, final price for 3s.
- **ResultsPage** — add CSV export button.

### Remove

Nothing removed.

## Implementation Plan

1. Create `src/frontend/src/lib/soundEngine.ts` — Web Audio API sound generator with 4 sound functions + mute state reading from localStorage. Export `playBidSound()`, `playChimeSound()`, `playCountdownBeep()`, `playSoldSound()`, `isSoundEnabled()`, `setSoundEnabled()`.

2. Create `src/frontend/src/hooks/useSoundEffects.ts` — hook that takes engine state and previous state, fires correct sounds when: new bid arrives, last 5s countdown ticks, player sold.

3. Create `src/frontend/src/components/LeaderboardMiniPanel.tsx` — compact top-5 leaderboard panel from engine state. Gold/silver/bronze medals for top 3. Shows rank, team name, players, total spent.

4. Create `src/frontend/src/pages/LeaderboardPage.tsx` — full leaderboard page at `/leaderboard`. Full table with all teams. Sort by total spend. Clickable team names → `/squad/:teamId`. "Back to Auction" link.

5. Create `src/frontend/src/pages/SquadPage.tsx` — squad detail page at `/squad/:teamId`. Shows team summary + full player list with price. Accessible to everyone.

6. Update `src/frontend/src/App.tsx` — add `/leaderboard` and `/squad/:teamId` routes.

7. Update `src/frontend/src/components/AppHeader.tsx` — add Leaderboard nav link + sound toggle button.

8. Update `src/frontend/src/pages/AuctionRoom.tsx` — add `LeaderboardMiniPanel` in right column.

9. Update `src/frontend/src/pages/TeamDashboard.tsx` — add `LeaderboardMiniPanel` + "View Squad" and "Full Leaderboard" links in right sidebar. Wire `useSoundEffects`.

10. Update `src/frontend/src/pages/WatchPage.tsx` — add `LeaderboardMiniPanel`. Wire `useSoundEffects`.

11. Update `src/frontend/src/components/AuctionDramaOverlay.tsx` — when SOLD: show player name, team name, price for 3s.

12. Update `src/frontend/src/pages/ResultsPage.tsx` — add CSV export button using browser `Blob` + `URL.createObjectURL`.

13. Pass engine data (results, teams, allPlayers) to leaderboard/squad components — all computed client-side from existing engine state.
