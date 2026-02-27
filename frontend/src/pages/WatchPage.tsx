import React, { useState, useEffect, useRef } from 'react';
import { useCurrentPlayer, useCurrentAuctionState, useGetPlayers, AuctionStatus } from '../hooks/useQueries';
import { Eye, Trophy, TrendingUp, Clock, Radio, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import BidHighlight from '../components/BidHighlight';
import SkeletonLoader from '../components/SkeletonLoader';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import {
  formatCurrency,
  getRoleLabel,
  getCategoryLabel,
  getRoleColor,
  getCategoryBadgeColor,
} from '../lib/utils';
import type { Player } from '../backend';

interface BidFeedEntry {
  id: string;
  team: string;
  amount: bigint;
  timestamp: number;
}

function PlayerPhoto({ player }: { player: Player }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    const load = async () => {
      try {
        const direct = player.photo.getDirectURL();
        if (direct) {
          setPhotoUrl(direct);
          return;
        }
        const bytes = await player.photo.getBytes();
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      } catch {
        setPhotoUrl(null);
      }
    };
    load();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [player.photo]);

  return (
    <div className="w-full h-full">
      {photoUrl ? (
        <img src={photoUrl} alt={player.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🏏</div>
      )}
    </div>
  );
}

export default function WatchPage() {
  const { data: currentPlayer, isLoading: playerLoading } = useCurrentPlayer();
  const { data: auctionState } = useCurrentAuctionState();
  const { data: players } = useGetPlayers();

  const [currentBid, setCurrentBid] = useState<bigint>(0n);
  const [leadingTeam, setLeadingTeam] = useState<string>('');
  const [bidFeed, setBidFeed] = useState<BidFeedEntry[]>([]);
  const [timer, setTimer] = useState(30);
  const prevPlayerRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLive = auctionState === AuctionStatus.live;
  const isPaused = auctionState === AuctionStatus.paused;
  const isCompleted = auctionState === AuctionStatus.completed;
  const isNotStarted = !auctionState || auctionState === AuctionStatus.notStarted;

  // Reset state when player changes
  useEffect(() => {
    const playerKey = currentPlayer?.name ?? null;
    if (playerKey !== prevPlayerRef.current) {
      prevPlayerRef.current = playerKey;
      if (currentPlayer) {
        setCurrentBid(currentPlayer.basePrice);
        setLeadingTeam('');
        setTimer(30);
        setBidFeed([]);
      }
    }
  }, [currentPlayer]);

  // Countdown timer
  useEffect(() => {
    if (isLive && currentPlayer) {
      timerRef.current = setInterval(() => {
        setTimer((t) => Math.max(0, t - 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive, currentPlayer]);

  const timerColor =
    timer <= 10 ? 'text-destructive animate-timer-pulse' :
    timer <= 20 ? 'text-chart-4' :
    'text-cyan';

  const statusConfig = isLive
    ? { label: '🔴 LIVE', bg: 'bg-chart-3/10 border-chart-3/30', dot: 'bg-chart-3 animate-pulse', text: 'text-chart-3' }
    : isPaused
    ? { label: '⏸ Paused', bg: 'bg-chart-4/10 border-chart-4/30', dot: 'bg-chart-4', text: 'text-chart-4' }
    : isCompleted
    ? { label: '✅ Completed', bg: 'bg-cyan/10 border-cyan/30', dot: 'bg-cyan', text: 'text-cyan' }
    : { label: '⏳ Not Started', bg: 'bg-secondary border-border', dot: 'bg-muted-foreground', text: 'text-muted-foreground' };

  const totalPlayers = players?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink/10 border border-pink/20 mb-4">
            <Radio className="w-4 h-4 text-pink animate-pulse-glow" />
            <span className="text-sm font-medium text-pink">Live Auction Viewer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-2">
            Bid Build Battle
          </h1>
          <p className="text-muted-foreground">
            Watch the live IPL auction in real time — no login required.
          </p>
        </div>

        {/* Status Banner */}
        <div className={`flex items-center justify-between p-4 rounded-xl border mb-6 ${statusConfig.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusConfig.dot}`} />
            <span className={`font-semibold ${statusConfig.text}`}>{statusConfig.label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              {totalPlayers} players
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Current Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-navy rounded-2xl overflow-hidden border border-border shadow-card">
              {/* Card Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan" />
                  Current Player on Auction
                </h2>
                {isLive && currentPlayer && (
                  <div className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${timerColor}`}>
                    <Clock className="w-5 h-5" />
                    {timer}s
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6">
                {playerLoading ? (
                  <SkeletonLoader variant="list" count={1} />
                ) : currentPlayer ? (
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Photo */}
                    <div className="w-full sm:w-48 h-56 sm:h-64 rounded-xl overflow-hidden bg-navy-mid border border-border flex-shrink-0">
                      <PlayerPhoto player={currentPlayer} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">{currentPlayer.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={`text-xs border-0 ${getRoleColor(currentPlayer.role)}`}>
                            {getRoleLabel(currentPlayer.role)}
                          </Badge>
                          <Badge className={`text-xs ${getCategoryBadgeColor(currentPlayer.category)}`}>
                            {getCategoryLabel(currentPlayer.category)}
                          </Badge>
                        </div>
                        {currentPlayer.stats && (
                          <p className="text-sm text-muted-foreground mt-2 italic">{currentPlayer.stats}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground mb-1">Base Price</p>
                          <p className="text-lg font-bold text-cyan">{formatCurrency(currentPlayer.basePrice)}</p>
                        </div>
                        <BidHighlight trigger={currentBid} className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground mb-1">Current Bid</p>
                          <p className="text-lg font-bold text-pink">{formatCurrency(currentBid)}</p>
                        </BidHighlight>
                      </div>

                      {leadingTeam ? (
                        <div className="flex items-center gap-2 p-3 bg-cyan/10 rounded-xl border border-cyan/20">
                          <TrendingUp className="w-4 h-4 text-cyan flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Leading Bid</p>
                            <p className="text-sm font-semibold text-cyan">{leadingTeam}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border">
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">No bids yet — starting at base price</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isNotStarted ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Auction Not Started</h3>
                    <p className="text-muted-foreground text-sm">
                      The auction hasn't begun yet. Check back soon!
                    </p>
                  </div>
                ) : isCompleted ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-10 h-10 text-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Auction Completed!</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      The auction has ended. View the final results below.
                    </p>
                    <a
                      href="/results"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-cyan-pink text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      View Results →
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-chart-4/10 border border-chart-4/20 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-10 h-10 text-chart-4" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Auction Paused</h3>
                    <p className="text-muted-foreground text-sm">
                      The host has paused the auction. It will resume shortly.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bid Feed */}
            {bidFeed.length > 0 && (
              <div className="card-navy rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan" />
                  Recent Bids
                </h3>
                <ScrollArea className="h-52">
                  <div className="space-y-2">
                    {bidFeed.map((bid, i) => (
                      <div
                        key={bid.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          i === 0
                            ? 'bg-cyan/10 border border-cyan/20'
                            : 'bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {i === 0 && <TrendingUp className="w-3.5 h-3.5 text-cyan" />}
                          <span className="text-sm font-medium text-foreground">{bid.team}</span>
                          {i === 0 && (
                            <Badge className="text-xs bg-cyan/20 text-cyan border-0 ml-1">Leading</Badge>
                          )}
                        </div>
                        <span className={`text-sm font-bold ${i === 0 ? 'text-cyan' : 'text-muted-foreground'}`}>
                          {formatCurrency(bid.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right: Info Panel */}
          <div className="space-y-4">
            {/* How to Watch */}
            <div className="card-navy rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-pink" />
                Viewer Mode
              </h3>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You're watching the live auction as a spectator. No login required.
                </p>
                <div className="space-y-2">
                  {[
                    { icon: '🔴', text: 'Live bids update in real time' },
                    { icon: '⏱', text: 'Countdown timer per player' },
                    { icon: '📊', text: 'Full bid history visible' },
                    { icon: '🏆', text: 'Results after auction ends' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Participate CTA */}
            <div className="card-navy rounded-xl p-5 border border-pink/20 bg-pink/5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Want to Participate?</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Register your team and get approved by the host to start bidding.
              </p>
              <a
                href="/team/register"
                className="block w-full text-center px-4 py-2.5 rounded-xl bg-pink text-white text-sm font-semibold hover:bg-pink/90 transition-colors"
              >
                Register Team →
              </a>
              <a
                href="/team/login"
                className="block w-full text-center px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-colors mt-2"
              >
                Team Login
              </a>
            </div>

            {/* Player Pool Stats */}
            {totalPlayers > 0 && (
              <div className="card-navy rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-cyan" />
                  Auction Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Players</span>
                    <span className="font-semibold text-foreground">{totalPlayers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-semibold ${statusConfig.text}`}>
                      {isLive ? 'Live' : isPaused ? 'Paused' : isCompleted ? 'Completed' : 'Not Started'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
