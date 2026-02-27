import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, Trophy, Loader2, AlertCircle, Info, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '../components/AppFooter';

type LoginPhase = 'idle' | 'logging-in' | 'verifying' | 'error';

export default function AdminLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login, clear, loginStatus, identity, isInitializing, isLoginError } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const [phase, setPhase] = useState<LoginPhase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const verifyAttempted = useRef(false);

  // After a login attempt completes and actor is ready, verify admin status
  useEffect(() => {
    if (
      phase !== 'verifying' ||
      verifyAttempted.current ||
      !identity ||
      !actor ||
      actorFetching
    ) {
      return;
    }

    verifyAttempted.current = true;

    const checkAdmin = async () => {
      try {
        let isAdmin = false;
        try {
          if (typeof (actor as any).isCallerAdmin === 'function') {
            isAdmin = await (actor as any).isCallerAdmin();
          } else {
            isAdmin = await actor.isAdmin();
          }
        } catch {
          isAdmin = await actor.isAdmin();
        }

        if (isAdmin) {
          queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
          void navigate({ to: '/admin/dashboard', replace: true });
        } else {
          setPhase('error');
          setErrorMsg('This account does not have admin privileges. Please use an admin account.');
        }
      } catch (err: any) {
        const msg: string = err?.message ?? '';
        if (msg.includes('Unauthorized')) {
          setPhase('error');
          setErrorMsg('This account does not have admin privileges. Please use an admin account.');
        } else {
          // Likely became admin (first caller auto-promoted), redirect
          queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
          void navigate({ to: '/admin/dashboard', replace: true });
        }
      }
    };

    void checkAdmin();
  }, [phase, identity, actor, actorFetching, navigate, queryClient]);

  // Watch for login completion to transition to verifying
  useEffect(() => {
    if (phase === 'logging-in' && loginStatus === 'success' && identity) {
      setPhase('verifying');
    }
    if (phase === 'logging-in' && isLoginError) {
      setPhase('error');
      setErrorMsg('Login failed. Please try again.');
    }
  }, [loginStatus, isLoginError, identity, phase]);

  const handleLogin = async () => {
    setErrorMsg(null);
    verifyAttempted.current = false;

    if (identity) {
      // Already authenticated — clear and re-login with a different account
      setPhase('logging-in');
      try {
        await clear();
        queryClient.clear();
        await new Promise((r) => setTimeout(r, 300));
        login();
      } catch {
        login();
      }
      return;
    }

    setPhase('logging-in');
    login();
  };

  const handleLogout = async () => {
    setPhase('idle');
    setErrorMsg(null);
    verifyAttempted.current = false;
    await clear();
    queryClient.clear();
  };

  const isLoading =
    isInitializing ||
    phase === 'logging-in' ||
    phase === 'verifying' ||
    loginStatus === 'logging-in';

  const buttonLabel = () => {
    if (phase === 'logging-in' || loginStatus === 'logging-in') return 'Connecting...';
    if (phase === 'verifying') return 'Verifying...';
    if (isInitializing) return 'Loading...';
    return 'Login with Internet Identity';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/generated/stadium-hero.dim_1920x1080.png')" }}
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-pink/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md mx-auto px-4 py-12">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-cyan-pink shadow-cyan-glow mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient">B³</h1>
            <p className="text-muted-foreground text-sm mt-1">Bid Build Battle</p>
          </div>

          {/* Card */}
          <div className="card-navy rounded-2xl p-8 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Login</h2>
                <p className="text-xs text-muted-foreground">Host / Super Admin access</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Sign in with your Internet Identity to access the admin panel and manage the IPL auction.
            </p>

            {/* First-time info note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan/5 border border-cyan/15 mb-5">
              <Info className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-cyan font-medium">First time?</span> The first account to log in will automatically be granted admin rights.
              </p>
            </div>

            {/* Error state */}
            {phase === 'error' && errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            {/* Verifying state */}
            {phase === 'verifying' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan/10 border border-cyan/20 mb-4">
                <Loader2 className="w-4 h-4 text-cyan animate-spin flex-shrink-0" />
                <p className="text-sm text-cyan">Verifying admin access...</p>
              </div>
            )}

            {/* Main login button */}
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-cyan-glow"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {buttonLabel()}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Login with Internet Identity
                </span>
              )}
            </Button>

            {/* Try different account button — shown after error */}
            {phase === 'error' && identity && (
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full h-10 mt-3 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Try a different account
              </Button>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Not an admin?{' '}
                <button
                  onClick={() => void navigate({ to: '/team/login' })}
                  className="text-cyan hover:text-cyan/80 transition-colors"
                >
                  Team Login →
                </button>
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Secure', desc: 'ICP Identity' },
              { label: 'Real-time', desc: 'Live Auction' },
              { label: 'Full Control', desc: 'Admin Panel' },
            ].map((item) => (
              <div key={item.label} className="card-navy rounded-xl p-3">
                <p className="text-xs font-semibold text-cyan">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
