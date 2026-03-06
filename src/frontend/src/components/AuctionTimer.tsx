/**
 * AuctionTimer — large circular countdown display for live auctions.
 * Color shifts green → amber → red as time decreases.
 */

import React from "react";

interface AuctionTimerProps {
  timeLeft: number;
  totalTime?: number;
  size?: "sm" | "md" | "lg";
}

export default function AuctionTimer({
  timeLeft,
  totalTime = 30,
  size = "md",
}: AuctionTimerProps) {
  const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference * (1 - percent / 100);

  // Color based on time remaining
  const getColor = () => {
    if (timeLeft > 20)
      return {
        stroke: "oklch(0.75 0.18 145)",
        text: "text-green-400",
        ring: "#4ade80",
      };
    if (timeLeft > 10)
      return {
        stroke: "oklch(0.80 0.18 80)",
        text: "text-yellow-400",
        ring: "#facc15",
      };
    return {
      stroke: "oklch(0.65 0.22 25)",
      text: "text-red-400",
      ring: "#f87171",
    };
  };

  const color = getColor();
  const isUrgent = timeLeft <= 10 && timeLeft > 0;

  const dims = {
    sm: {
      container: "w-16 h-16",
      fontSize: "text-lg",
      svg: 100,
      labelSize: "text-xs",
    },
    md: {
      container: "w-24 h-24",
      fontSize: "text-2xl",
      svg: 100,
      labelSize: "text-xs",
    },
    lg: {
      container: "w-36 h-36",
      fontSize: "text-4xl",
      svg: 100,
      labelSize: "text-sm",
    },
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center ${dims.container} ${isUrgent ? "animate-timer-pulse" : ""}`}
      role="timer"
      aria-label={`${timeLeft} seconds remaining`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full -rotate-90"
        aria-hidden="true"
      >
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="oklch(0.22 0.04 255)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color.ring}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease",
          }}
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span
          className={`font-bold font-poppins leading-none ${dims.fontSize} ${color.text}`}
        >
          {timeLeft}
        </span>
        <span
          className={`${dims.labelSize} text-muted-foreground mt-0.5 leading-none`}
        >
          sec
        </span>
      </div>

      {/* Glow effect when urgent */}
      {isUrgent && (
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            boxShadow: `0 0 20px ${color.ring}, 0 0 40px ${color.ring}`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
