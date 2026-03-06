import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface SkeletonLoaderProps {
  variant?: "card" | "table-row" | "text" | "player-card" | "list";
  count?: number;
}

export default function SkeletonLoader({
  variant = "card",
  count = 1,
}: SkeletonLoaderProps) {
  const keys = Array.from(
    { length: count },
    (_, i) => `skeleton-${variant}-${i}`,
  );

  if (variant === "player-card") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {keys.map((key) => (
          <div key={key} className="card-navy rounded-xl overflow-hidden">
            <Skeleton className="h-40 w-full bg-muted" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-muted" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
              <Skeleton className="h-3 w-2/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key} className="flex gap-4 p-3 card-navy rounded-lg">
            <Skeleton className="h-4 w-1/4 bg-muted" />
            <Skeleton className="h-4 w-1/4 bg-muted" />
            <Skeleton className="h-4 w-1/4 bg-muted" />
            <Skeleton className="h-4 w-1/4 bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key}
            className="flex items-center gap-3 p-3 card-navy rounded-lg"
          >
            <Skeleton className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/2 bg-muted" />
              <Skeleton className="h-3 w-1/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className="space-y-2">
        {keys.map((key) => (
          <Skeleton key={key} className="h-4 w-full bg-muted" />
        ))}
      </div>
    );
  }

  // Default card
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {keys.map((key) => (
        <div key={key} className="card-navy rounded-xl p-4 space-y-3">
          <Skeleton className="h-5 w-1/2 bg-muted" />
          <Skeleton className="h-4 w-3/4 bg-muted" />
          <Skeleton className="h-4 w-2/3 bg-muted" />
          <Skeleton className="h-8 w-full bg-muted rounded-lg" />
        </div>
      ))}
    </div>
  );
}
