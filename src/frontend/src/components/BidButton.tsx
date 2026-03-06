/**
 * BidButton — large, prominent bidding action button.
 * Shows bid amount, glows on hover, pulses when active.
 */

import { Loader2, Zap } from "lucide-react";
import React from "react";
import { formatCurrency } from "../utils/currencyFormatter";

interface BidButtonProps {
  onBid: () => void;
  bidAmount: bigint;
  isDisabled?: boolean;
  disabledReason?: string;
  isPending?: boolean;
}

export default function BidButton({
  onBid,
  bidAmount,
  isDisabled = false,
  disabledReason,
  isPending = false,
}: BidButtonProps) {
  const disabled = isDisabled || isPending;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button
        type="button"
        data-ocid="bid_button.primary_button"
        onClick={onBid}
        disabled={disabled}
        aria-label={`Place bid of ${formatCurrency(bidAmount)}`}
        aria-disabled={disabled}
        className={[
          "relative w-full min-h-[4rem] px-8 py-4 rounded-2xl font-bold text-xl font-poppins",
          "transition-all duration-200 select-none",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50",
          disabled
            ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
            : [
                "gradient-cyan-pink text-white cursor-pointer",
                "shadow-[0_0_0_0_oklch(0.78_0.18_195_/_0)]",
                "hover:shadow-[0_0_24px_4px_oklch(0.78_0.18_195_/_0.5)]",
                "hover:scale-[1.02] active:scale-[0.98]",
                "animate-pulse-glow",
              ].join(" "),
        ].join(" ")}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Placing Bid...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className={`w-5 h-5 ${disabled ? "" : "text-white"}`} />
            BID {formatCurrency(bidAmount)}
          </span>
        )}

        {/* Shimmer overlay on hover */}
        {!disabled && (
          <span
            className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <span
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
              }}
            />
          </span>
        )}
      </button>

      {/* Disabled reason tooltip */}
      {disabled && disabledReason && (
        <output
          data-ocid="bid_button.error_state"
          className="text-xs text-muted-foreground text-center px-4 block"
          aria-live="polite"
        >
          {disabledReason}
        </output>
      )}
    </div>
  );
}
