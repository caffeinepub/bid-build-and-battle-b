import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PlayerRole, PlayerCategory, AuctionStatus, TeamStatus } from '../backend';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: bigint | number): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  if (num >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(2)} Cr`;
  }
  if (num >= 100_000) {
    return `₹${(num / 100_000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatCurrencyShort(amount: bigint | number): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  if (num >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(1)}Cr`;
  }
  if (num >= 100_000) {
    return `₹${(num / 100_000).toFixed(1)}L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export function getRoleLabel(role: PlayerRole): string {
  const labels: Record<PlayerRole, string> = {
    [PlayerRole.batsman]: 'Batsman',
    [PlayerRole.bowler]: 'Bowler',
    [PlayerRole.allRounder]: 'All-Rounder',
    [PlayerRole.wicketKeeper]: 'Wicket-Keeper',
  };
  return labels[role] ?? role;
}

export function getCategoryLabel(category: PlayerCategory): string {
  const labels: Record<PlayerCategory, string> = {
    [PlayerCategory.cappedIndian]: 'Capped Indian',
    [PlayerCategory.uncappedIndian]: 'Uncapped Indian',
    [PlayerCategory.foreign]: 'Overseas/Foreign',
  };
  return labels[category] ?? category;
}

export function getRoleColor(role: PlayerRole): string {
  const colors: Record<PlayerRole, string> = {
    [PlayerRole.batsman]: 'bg-cyan/20 text-cyan',
    [PlayerRole.bowler]: 'bg-pink/20 text-pink',
    [PlayerRole.allRounder]: 'bg-chart-3/20 text-chart-3',
    [PlayerRole.wicketKeeper]: 'bg-chart-4/20 text-chart-4',
  };
  return colors[role] ?? 'bg-muted text-muted-foreground';
}

export function getCategoryBadgeColor(category: PlayerCategory): string {
  const colors: Record<PlayerCategory, string> = {
    [PlayerCategory.cappedIndian]: 'bg-cyan/10 text-cyan border-cyan/20',
    [PlayerCategory.uncappedIndian]: 'bg-muted text-muted-foreground border-border',
    [PlayerCategory.foreign]: 'bg-pink/10 text-pink border-pink/20',
  };
  return colors[category] ?? 'bg-muted text-muted-foreground';
}

export function getAuctionStatusLabel(status: AuctionStatus | null): string {
  if (!status) return 'Not Started';
  const labels: Record<AuctionStatus, string> = {
    [AuctionStatus.notStarted]: 'Not Started',
    [AuctionStatus.live]: 'Live',
    [AuctionStatus.paused]: 'Paused',
    [AuctionStatus.completed]: 'Completed',
  };
  return labels[status] ?? 'Unknown';
}

export function getAuctionStatusColor(status: AuctionStatus | null): string {
  if (!status || status === AuctionStatus.notStarted) return 'bg-muted text-muted-foreground';
  const colors: Record<AuctionStatus, string> = {
    [AuctionStatus.notStarted]: 'bg-muted text-muted-foreground',
    [AuctionStatus.live]: 'bg-chart-3/20 text-chart-3',
    [AuctionStatus.paused]: 'bg-chart-4/20 text-chart-4',
    [AuctionStatus.completed]: 'bg-cyan/20 text-cyan',
  };
  return colors[status] ?? 'bg-muted text-muted-foreground';
}

export function getTeamStatusColor(status: TeamStatus): string {
  const colors: Record<TeamStatus, string> = {
    [TeamStatus.pending]: 'bg-chart-4/20 text-chart-4',
    [TeamStatus.approved]: 'bg-chart-3/20 text-chart-3',
    [TeamStatus.rejected]: 'bg-destructive/20 text-destructive',
  };
  return colors[status] ?? 'bg-muted text-muted-foreground';
}

export function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isForeignPlayer(category: PlayerCategory): boolean {
  return category === PlayerCategory.foreign;
}
