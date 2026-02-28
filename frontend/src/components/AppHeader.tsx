import React, { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsAdmin } from '../hooks/useQueries';
import { Menu, X, Trophy, Eye, BarChart3, LogOut, LogIn, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { identity, clear } = useInternetIdentity();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const isAuthenticated = !!identity;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    void navigate({ to: '/watch' });
    setMobileOpen(false);
  };

  const handleAdminLogout = () => {
    // For admin (passcode-based), just clear the query cache to reset admin state
    queryClient.clear();
    void navigate({ to: '/watch' });
    setMobileOpen(false);
  };

  const navLinks: Array<{ to: string; label: string; icon: React.ElementType }> = [
    { to: '/watch', label: 'Live Auction', icon: Eye },
    { to: '/results', label: 'Results', icon: BarChart3 },
  ];

  if (isAdmin) {
    navLinks.push({ to: '/admin/dashboard', label: 'Admin', icon: Shield });
  } else if (isAuthenticated) {
    navLinks.push({ to: '/team/dashboard', label: 'My Team', icon: Users });
  }

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => void navigate({ to: '/watch' })}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg gradient-cyan-pink flex items-center justify-center shadow-cyan-glow">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">B³</span>
            <span className="hidden sm:block text-xs text-muted-foreground font-medium">
              Bid Build Battle
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => void navigate({ to: to as '/' })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-cyan/10 text-cyan border border-cyan/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Auth Button */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin ? (
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
                  onClick={() => void navigate({ to: '/team/login' })}
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Team Login
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate({ to: '/admin/login' })}
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
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1 animate-fade-in-up">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => {
                  void navigate({ to: to as '/' });
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${
                  isActive(to)
                    ? 'bg-cyan/10 text-cyan'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-border">
              {isAdmin ? (
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Admin Logout
                </button>
              ) : isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      void navigate({ to: '/team/login' });
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Team Login
                  </button>
                  <button
                    onClick={() => {
                      void navigate({ to: '/admin/login' });
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
