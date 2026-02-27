import React from 'react';
import type { Player } from '../backend';
import { PlayerRole, PlayerCategory } from '../hooks/useQueries';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getRoleLabel, getCategoryLabel, getRoleColor } from '../lib/utils';

interface PlayerCardProps {
  player: Player;
  currentBid?: bigint;
  leadingTeam?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayerCard({ player, currentBid, leadingTeam, size = 'md', className = '' }: PlayerCardProps) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let url: string | null = null;
    const loadPhoto = async () => {
      try {
        const directUrl = player.photo.getDirectURL();
        if (directUrl) {
          setPhotoUrl(directUrl);
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
    loadPhoto();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [player.photo]);

  const isLarge = size === 'lg';
  const isMedium = size === 'md';

  return (
    <div
      className={`card-navy rounded-xl overflow-hidden shadow-card transition-all duration-300 hover:shadow-cyan-glow hover:-translate-y-0.5 ${className}`}
    >
      {/* Photo */}
      <div className={`relative ${isLarge ? 'h-64' : isMedium ? 'h-40' : 'h-28'} bg-navy-mid overflow-hidden`}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${isLarge ? 'text-6xl' : isMedium ? 'text-4xl' : 'text-2xl'} opacity-30`}>🏏</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <Badge
            className={`text-xs ${getRoleColor(player.role)} border-0`}
          >
            {getRoleLabel(player.role)}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className={`p-${isLarge ? '4' : '3'}`}>
        <h3 className={`font-bold text-foreground ${isLarge ? 'text-xl' : isMedium ? 'text-base' : 'text-sm'} truncate`}>
          {player.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{getCategoryLabel(player.category)}</p>

        {player.stats && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{player.stats}</p>
        )}

        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Base Price</span>
            <span className="text-sm font-semibold text-cyan">{formatCurrency(player.basePrice)}</span>
          </div>
          {currentBid !== undefined && currentBid > 0n && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Current Bid</span>
              <span className="text-sm font-bold text-pink">{formatCurrency(currentBid)}</span>
            </div>
          )}
          {leadingTeam && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Leading</span>
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{leadingTeam}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
