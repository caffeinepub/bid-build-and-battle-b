/**
 * PlayerCard — premium player display card for live auction.
 * Shows photo, name, role/category badges, base price, current bid, and leading team.
 * Supports loading skeleton state.
 * Uses LocalPlayer from local store (no ICP backend calls).
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, User } from "lucide-react";
import React from "react";
import type { LocalPlayer } from "../lib/auctionStore";
import {
  formatCurrency,
  getCategoryLabel,
  getRoleColor,
  getRoleLabel,
} from "../utils/playerHelpers";

interface PlayerCardProps {
  player?: LocalPlayer | null;
  currentBid?: bigint;
  leadingTeam?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PlayerCard({
  player,
  currentBid,
  leadingTeam,
  isLoading = false,
  size = "md",
  className = "",
}: PlayerCardProps) {
  const isLarge = size === "lg";
  const isMedium = size === "md";

  const photoHeight = isLarge ? "h-56" : isMedium ? "h-44" : "h-28";
  const nameSize = isLarge ? "text-2xl" : isMedium ? "text-lg" : "text-sm";
  const padding = isLarge ? "p-5" : "p-4";

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        data-ocid="player_card.loading_state"
        className={`card-navy rounded-2xl overflow-hidden shadow-card ${className}`}
        aria-busy="true"
        aria-label="Loading player"
      >
        <Skeleton className={`w-full ${photoHeight} rounded-none`} />
        <div className={`${padding} space-y-3`}>
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          <div className="pt-2 space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Empty / no player
  if (!player) {
    return (
      <div
        data-ocid="player_card.empty_state"
        className={`card-navy rounded-2xl overflow-hidden shadow-card flex flex-col items-center justify-center ${photoHeight} min-h-[280px] ${className}`}
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No player selected
          </p>
          <p className="text-xs text-muted-foreground/60">
            Select a player from the list to begin bidding
          </p>
        </div>
      </div>
    );
  }

  const hasBid = currentBid !== undefined && currentBid > 0n;

  return (
    <div
      data-ocid="player_card.card"
      className={`card-navy rounded-2xl overflow-hidden shadow-card transition-all duration-300 hover:shadow-cyan-glow hover:scale-[1.02] ${className}`}
    >
      {/* Photo */}
      <div className={`relative ${photoHeight} bg-navy-mid overflow-hidden`}>
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User
              className="w-12 h-12 text-muted-foreground/30"
              aria-hidden="true"
            />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
        {/* Role badge overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 flex-wrap">
          <Badge className={`text-xs border ${getRoleColor(player.role)}`}>
            {getRoleLabel(player.role)}
          </Badge>
          <Badge className="text-xs bg-white/10 text-white/80 border-white/20 border">
            {getCategoryLabel(player.category)}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className={padding}>
        <h3
          className={`font-bold text-foreground ${nameSize} truncate leading-tight mb-1`}
        >
          {player.name}
        </h3>

        {player.stats && (
          <p className="text-xs text-muted-foreground mb-3 truncate">
            {player.stats}
          </p>
        )}

        <div className="space-y-2 mt-3 pt-3 border-t border-border/60">
          {/* Base price */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Base Price</span>
            <span className="text-sm font-bold text-cyan">
              {formatCurrency(BigInt(Math.round(player.basePrice)))}
            </span>
          </div>

          {/* Current bid */}
          {hasBid && (
            <div
              data-ocid="player_card.section"
              className="flex items-center justify-between animate-bid-flash-pink rounded-sm"
            >
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Current Bid
              </span>
              <span className="text-sm font-extrabold text-pink glow-pink">
                {formatCurrency(currentBid!)}
              </span>
            </div>
          )}

          {/* Leading team */}
          {leadingTeam && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Leading</span>
              <span className="text-xs font-semibold text-pink truncate max-w-[140px]">
                {leadingTeam}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
