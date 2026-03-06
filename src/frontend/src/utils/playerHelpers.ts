/**
 * Player display helpers for B³ Auction App.
 * Role labels, category labels, badge colors, and currency formatting.
 * Supports both backend PlayerRole/PlayerCategory enums and local string literals.
 */

import { formatCurrency } from "./currencyFormatter";

export { formatCurrency };

// Role can be enum value or local string literal
export function getRoleLabel(role: string): string {
  switch (role) {
    case "batsman":
      return "Batsman";
    case "bowler":
      return "Bowler";
    case "allRounder":
      return "All-Rounder";
    case "wicketKeeper":
      return "Wicket-Keeper";
    default:
      return "Unknown";
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case "cappedIndian":
      return "Capped Indian";
    case "uncappedIndian":
      return "Uncapped Indian";
    case "foreign":
      return "Overseas";
    default:
      return "Unknown";
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case "batsman":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "bowler":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "allRounder":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    case "wicketKeeper":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case "cappedIndian":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "uncappedIndian":
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "foreign":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getTeamStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    case "rejected":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "pending":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
