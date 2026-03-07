import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Lock, Shield } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { setAdminSession } from "../lib/authConstants";

const ADMIN_PASSCODE = "sastra2026";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passcode.trim()) {
      setError("Please enter the admin passcode");
      return;
    }

    setIsLoading(true);
    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 300));

    if (passcode.trim() !== ADMIN_PASSCODE) {
      setError("Incorrect passcode. Please try again.");
      setIsLoading(false);
      return;
    }

    setAdminSession();
    navigate({ to: "/admin/dashboard" });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background orbs */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "oklch(0.82 0.18 85)" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "oklch(0.78 0.18 195)" }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
            alt="IPL Auction — Bid Build Battle"
            className="w-44 sm:w-52 h-auto object-contain mb-4 animate-splash-in"
            style={{
              filter: "drop-shadow(0 0 16px oklch(0.82 0.18 85 / 0.3))",
            }}
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Admin Portal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            IPL Auction Management System
          </p>
        </div>

        <Card
          className="shadow-lg"
          style={{
            border: "1px solid oklch(0.82 0.18 85 / 0.25)",
            background: "oklch(0.16 0.03 255)",
            boxShadow:
              "0 0 40px oklch(0.82 0.18 85 / 0.08), 0 8px 32px oklch(0.05 0.01 255 / 0.5)",
          }}
        >
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Secure Login
            </CardTitle>
            <CardDescription>
              Enter your admin passcode to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="passcode">Admin Passcode</Label>
                <Input
                  id="passcode"
                  data-ocid="admin_login.input"
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="font-mono"
                />
              </div>

              <Button
                type="submit"
                data-ocid="admin_login.submit_button"
                className="w-full gradient-cyan-pink text-white font-semibold hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Team owners?{" "}
          <button
            type="button"
            onClick={() => navigate({ to: "/team/login" })}
            className="text-primary hover:underline"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
