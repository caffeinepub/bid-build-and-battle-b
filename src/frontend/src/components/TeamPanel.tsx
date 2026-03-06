/**
 * TeamPanel — vertical list of teams showing status, mock budget, and player count.
 * Highlights the currently leading bidder.
 */

import { Badge } from "@/components/ui/badge";
import { Crown, Users, Wallet } from "lucide-react";
import React from "react";
import type { Team } from "../backend";
import { TeamStatus } from "../backend";

interface TeamPanelProps {
  teams: Team[];
  highlightTeamName?: string;
}

function formatMockBudget(): string {
  return "₹90 Cr";
}

function getStatusBadge(status: TeamStatus | string) {
  switch (status) {
    case TeamStatus.approved:
    case "approved":
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 border text-xs">
          Active
        </Badge>
      );
    case TeamStatus.rejected:
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 border text-xs">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 border text-xs">
          Pending
        </Badge>
      );
  }
}

export default function TeamPanel({
  teams,
  highlightTeamName,
}: TeamPanelProps) {
  const approvedTeams = teams.filter(
    (t) =>
      t.status === TeamStatus.approved ||
      t.status === ("approved" as TeamStatus),
  );
  const otherTeams = teams.filter(
    (t) =>
      t.status !== TeamStatus.approved &&
      t.status !== ("approved" as TeamStatus),
  );
  const sortedTeams = [...approvedTeams, ...otherTeams];

  return (
    <div data-ocid="team_panel.panel" className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan" />
          <span className="text-sm font-semibold text-foreground">Teams</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {teams.length} registered
        </span>
      </div>

      {/* Empty state */}
      {teams.length === 0 && (
        <div
          data-ocid="team_panel.empty_state"
          className="card-navy rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center"
        >
          <Users className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No teams registered yet.
          </p>
        </div>
      )}

      {/* Team cards */}
      {sortedTeams.map((team, idx) => {
        const isLeading = team.name === highlightTeamName;
        const isApproved =
          team.status === TeamStatus.approved ||
          team.status === ("approved" as TeamStatus);

        return (
          <div
            key={team.name}
            data-ocid={`team_panel.item.${idx + 1}`}
            className={[
              "card-navy rounded-xl p-3 transition-all duration-300",
              isLeading
                ? "border-cyan/50 glow-cyan ring-1 ring-cyan/30"
                : "border-border/50 hover:border-border",
            ].join(" ")}
          >
            {/* Team name + leading indicator */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isLeading && (
                  <Crown
                    className="w-3.5 h-3.5 text-cyan shrink-0"
                    aria-label="Leading bidder"
                  />
                )}
                <p
                  className={`font-semibold text-sm truncate ${
                    isLeading ? "text-cyan" : "text-foreground"
                  }`}
                >
                  {team.name}
                </p>
              </div>
              {getStatusBadge(team.status)}
            </div>

            {/* Owner */}
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {team.owner}
            </p>

            {/* Budget + players row */}
            {isApproved && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Budget:</span>
                  <span
                    className={`text-xs font-bold ${isLeading ? "text-cyan" : "text-foreground"}`}
                  >
                    {formatMockBudget()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    Players:
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    0
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
