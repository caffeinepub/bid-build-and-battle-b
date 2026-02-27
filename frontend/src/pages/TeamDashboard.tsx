import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCurrentPlayer,
  useCurrentAuctionState,
  useGetCallerUserProfile,
  AuctionStatus,
  PlayerCategory,
} from '../hooks/useQueries';
import {
  Trophy, LogOut, Users, TrendingUp, Clock, Zap, AlertCircle, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConfirmModal from '../components/ConfirmModal';
import BidHighlight from '../components/BidHighlight';
import SkeletonLoader from '../components/SkeletonLoader';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { formatCurrency, getRoleLabel, getCategoryLabel, getRoleColor, getCategoryBadgeColor } from '../lib/utils';
import { toast } from 'sonner';

interface BidEntry {
  id: string;
  team: string;
  amount: bigint;
  timestamp: number;
}

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: profile } = useGetCallerUserProfile();
  const { data: currentPlayer, isLoading: playerLoading } = useCurrentPlayer();
  const { data: auctionState } = useCurrentAuctionState();

  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [currentBid, setCurrentBid] = useState<bigint>(0n);
  const [leadingTeam, setLeadingTeam] = useState<string>('');
  const [confirmBid, setConfirmBid] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPlayerRef = useRef<string | null>(null);

  // Simulated budget (in a real app this would come from backend)
  const totalBudget = 100_000_000n; // ₹10 Cr
  const [spentBudget] = useState(0n);
  const remainingBudget = totalBudget - spentBudget;
  const budgetPercent = Number((remainingBudget * 100n) / totalBudget);
  const isBudgetLow = budgetPercent < 20;

  const isLive = auctionState === AuctionStatus.live;
  const isPaused = auctionState === AuctionStatus.paused;

  // Reset on new player
  useEffect(() => {
    const playerKey = currentPlayer?.name ?? null;
    if (playerKey !== prevPlayerRef.current) {
      prevPlayerRef.current = playerKey;
      if (currentPlayer) {
        setCurrentBid(currentPlayer.basePrice);
        setLeadingTeam('');
        setBidHistory([]);
        setTimer(30);
        setTimerActive(isLive);
      }
    }
  }, [currentPlayer, isLive]);

  // Timer countdown
  useEffect(() => {
    if (timerActive && isLive) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            setTimerActive(false);
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, isLive]);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    void navigate({ to: '/team/login' });
  };

  const nextBidAmount = currentBid + 100_000n; // +₹1L increment

  const canBid = isLive && currentPlayer && remainingBudget >= nextBidAmount;
  const bidDisabledReason = !isLive
    ? 'Auction is not live'
    : !currentPlayer
    ? 'No player on auction'
    : remainingBudget < nextBidAmount
    ? 'Insufficient budget'
    : null;

  const handlePlaceBid = async () => {
    if (!currentPlayer || !identity) return;
    setIsBidding(true);
    try {
      const teamName = profile?.name ?? 'My Team';
      const newBid = nextBidAmount;
      setCurrentBid(newBid);
      setLeadingTeam(teamName);
      setTimer(30);
      setTimerActive(true);
      setBidHistory((prev) => [
        { id: Date.now().toString(), team: teamName, amount: newBid, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      toast.success(`Bid of ${formatCurrency(newBid)} placed!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bid failed');
    } finally {
      setIsBidding(false);
      setConfirmBid(false);
    }
  };

  const timerColor = timer <= 10 ? 'text-destructive animate-timer-pulse' : timer <= 20 ? 'text-chart-4' : 'text-cyan';

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.name ?? 'Team Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">Team Owner Dashboard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        {/* Auction Status Banner */}
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-6 border ${
          isLive ? 'bg-chart-3/10 border-chart-3/20' :
          isPaused ? 'bg-chart-4/10 border-chart-4/20' :
          'bg-secondary border-border'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-chart-3 animate-pulse' : isPaused ? 'bg-chart-4' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">
            {isLive ? '🔴 Auction is LIVE' : isPaused ? '⏸ Auction Paused' : '⏳ Auction Not Started'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Live Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Player Card */}
            <div className="card-navy rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Current Player</h2>
                {isLive && (
                  <div className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${timerColor}`}>
                    <Clock className="w-5 h-5" />
                    {timer}s
                  </div>
                )}
              </div>

              {playerLoading ? (
                <SkeletonLoader variant="list" count={1} />
              ) : currentPlayer ? (
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Player Photo */}
                  <PlayerPhotoDisplay player={currentPlayer} />

                  {/* Player Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{currentPlayer.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className={`text-xs border-0 ${getRoleColor(currentPlayer.role)}`}>
                          {getRoleLabel(currentPlayer.role)}
                        </Badge>
                        <Badge className={`text-xs ${getCategoryBadgeColor(currentPlayer.category)}`}>
                          {getCategoryLabel(currentPlayer.category)}
                        </Badge>
                      </div>
                      {currentPlayer.stats && (
                        <p className="text-xs text-muted-foreground mt-1">{currentPlayer.stats}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Base Price</p>
                        <p className="text-sm font-bold text-cyan">{formatCurrency(currentPlayer.basePrice)}</p>
                      </div>
                      <BidHighlight trigger={currentBid} className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Current Bid</p>
                        <p className="text-sm font-bold text-pink">{formatCurrency(currentBid)}</p>
                      </BidHighlight>
                    </div>

                    {leadingTeam && (
                      <div className="flex items-center gap-2 p-2 bg-cyan/10 rounded-lg border border-cyan/20">
                        <TrendingUp className="w-4 h-4 text-cyan" />
                        <span className="text-sm text-cyan font-medium">Leading: {leadingTeam}</span>
                      </div>
                    )}

                    {/* BID BUTTON */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => setConfirmBid(true)}
                        disabled={!canBid || isBidding}
                        className="w-full h-14 text-lg font-bold rounded-xl gradient-cyan-pink text-white hover:opacity-90 disabled:opacity-50 shadow-cyan-glow transition-all"
                        style={{ minHeight: '48px' }}
                      >
                        {isBidding ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Placing Bid...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            BID {formatCurrency(nextBidAmount)}
                          </span>
                        )}
                      </Button>
                      {bidDisabledReason && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                          <AlertCircle className="w-3 h-3" /> {bidDisabledReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No player on auction right now.</p>
                  <p className="text-xs text-muted-foreground mt-1">Wait for the host to start the auction.</p>
                </div>
              )}
            </div>

            {/* Bid History */}
            {bidHistory.length > 0 && (
              <div className="card-navy rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Bid History</h3>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {bidHistory.map((bid, i) => (
                      <div key={bid.id} className={`flex items-center justify-between p-2.5 rounded-lg ${i === 0 ? 'bg-cyan/10 border border-cyan/20' : 'bg-secondary'}`}>
                        <div className="flex items-center gap-2">
                          {i === 0 && <TrendingUp className="w-3.5 h-3.5 text-cyan" />}
                          <span className="text-sm font-medium text-foreground">{bid.team}</span>
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

          {/* Right: Budget & Squad */}
          <div className="space-y-4">
            {/* Budget Tracker */}
            <div className="card-navy rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan" /> Budget Tracker
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={`font-bold ${isBudgetLow ? 'text-destructive' : 'text-cyan'}`}>
                    {formatCurrency(remainingBudget)}
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isBudgetLow ? 'bg-destructive' : 'gradient-cyan-pink'}`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Spent: {formatCurrency(spentBudget)}</span>
                  <span>Total: {formatCurrency(totalBudget)}</span>
                </div>
                {isBudgetLow && (
                  <div className="flex items-center gap-1.5 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive">Less than 20% budget remaining!</span>
                  </div>
                )}
              </div>
            </div>

            {/* My Squad */}
            <div className="card-navy rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-pink" /> My Squad
              </h3>
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No players acquired yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Start bidding to build your squad!</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />

      <ConfirmModal
        open={confirmBid}
        title="Place Bid"
        message={`Place a bid of ${formatCurrency(nextBidAmount)} for ${currentPlayer?.name ?? 'this player'}? This cannot be undone.`}
        confirmLabel={`Bid ${formatCurrency(nextBidAmount)}`}
        variant="success"
        onConfirm={handlePlaceBid}
        onCancel={() => setConfirmBid(false)}
        isLoading={isBidding}
      />
    </div>
  );
}

function PlayerPhotoDisplay({ player }: { player: { photo: import('../backend').ExternalBlob; name: string } }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    const load = async () => {
      try {
        const direct = player.photo.getDirectURL();
        if (direct) { setPhotoUrl(direct); return; }
        const bytes = await player.photo.getBytes();
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      } catch { setPhotoUrl(null); }
    };
    load();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [player.photo]);

  return (
    <div className="w-32 h-40 rounded-xl overflow-hidden bg-navy-mid flex-shrink-0 border border-border">
      {photoUrl ? (
        <img src={photoUrl} alt={player.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🏏</div>
      )}
    </div>
  );
}
