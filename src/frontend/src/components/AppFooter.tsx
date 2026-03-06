import { useNavigate } from "@tanstack/react-router";
import { Heart, Trophy } from "lucide-react";
import React from "react";

export default function AppFooter() {
  const year = new Date().getFullYear();
  const appId = encodeURIComponent(
    window.location.hostname || "bid-build-battle",
  );
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => void navigate({ to: "/watch" })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded gradient-cyan-pink flex items-center justify-center">
              <Trophy className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm text-gradient">
              Bid Build Battle (B³)
            </span>
          </button>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-pink fill-pink" />
            <span>using</span>
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:text-cyan/80 transition-colors font-medium"
            >
              caffeine.ai
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {year} B³. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
