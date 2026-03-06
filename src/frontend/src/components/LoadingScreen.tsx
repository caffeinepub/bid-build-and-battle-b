import React from "react";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-cyan/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-cyan animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gradient">B³</h2>
          <p className="text-muted-foreground text-sm mt-1">Loading...</p>
        </div>
      </div>
    </div>
  );
}
