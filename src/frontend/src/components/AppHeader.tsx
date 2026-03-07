import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  Eye,
  LogIn,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  ADMIN_SESSION_EVENT,
  clearAdminSession,
  getAdminSession,
} from "../lib/authConstants";

export default function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const isAuthenticated = !!identity;

  // Reactive admin session state — re-renders when sessionStorage changes
  const [isAdminSession, setIsAdminSession] = useState<boolean>(() =>
    getAdminSession(),
  );

  useEffect(() => {
    const handleSessionChange = () => {
      setIsAdminSession(getAdminSession());
    };
    // Listen for same-tab changes dispatched by setAdminSession / clearAdminSession
    window.addEventListener(ADMIN_SESSION_EVENT, handleSessionChange);
    // Also listen for cross-tab changes
    window.addEventListener("storage", handleSessionChange);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    void navigate({ to: "/watch" });
    setMobileOpen(false);
  };

  const handleAdminLogout = () => {
    // Clear the admin session flag and dispatch event so all components update
    clearAdminSession();
    // Also clear localStorage flag if it was set previously
    localStorage.removeItem("adminLoggedIn");
    // Clear query cache to reset admin state
    queryClient.clear();
    void navigate({ to: "/admin/login" });
    setMobileOpen(false);
  };

  const navLinks: Array<{
    to: string;
    label: string;
    icon: React.ElementType;
  }> = [
    { to: "/watch", label: "Live Auction", icon: Eye },
    { to: "/results", label: "Results", icon: BarChart3 },
  ];

  if (isAdminSession) {
    navLinks.push({ to: "/admin/dashboard", label: "Admin", icon: Shield });
  } else if (isAuthenticated) {
    navLinks.push({ to: "/team/dashboard", label: "My Team", icon: Users });
  }

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="flex items-center gap-2 group"
            aria-label="Go to home"
          >
            <img
              src="/assets/uploads/Cricket-auction-logo-for-Thanjavur-event-1.png"
              alt="B³ IPL Auction"
              className="h-9 w-auto object-contain"
            />
            <span className="hidden sm:block text-xs text-muted-foreground font-medium">
              Bid Build Battle
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <button
                type="button"
                key={to}
                onClick={() => void navigate({ to: to as "/" })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? "bg-cyan/10 text-cyan border border-cyan/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Auth Button */}
          <div className="hidden md:flex items-center gap-3">
            {isAdminSession ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAdminLogout}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <LogOut className="w-4 h-4" />
                Admin Logout
              </Button>
            ) : isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate({ to: "/team/login" })}
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Team Login
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate({ to: "/admin/login" })}
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1 animate-fade-in-up">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <button
                type="button"
                key={to}
                onClick={() => {
                  void navigate({ to: to as "/" });
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${
                  isActive(to)
                    ? "bg-cyan/10 text-cyan"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-border">
              {isAdminSession ? (
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Admin Logout
                </button>
              ) : isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({ to: "/team/login" });
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Team Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({ to: "/admin/login" });
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
