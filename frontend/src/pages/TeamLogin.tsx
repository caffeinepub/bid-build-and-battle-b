import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useIsCallerApproved,
  useIsCallerAdmin,
  useGetCallerUserProfile,
  useRequestApproval,
} from '../hooks/useQueries';
import { Users, Trophy, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '../components/AppFooter';
import { toast } from 'sonner';

export default function TeamLogin() {
  const navigate = useNavigate();
  const { login, loginStatus, identity, isInitializing, clear } = useInternetIdentity();
  const { data: isApproved, isLoading: approvalLoading } = useIsCallerApproved();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: profile } = useGetCallerUserProfile();
  const requestApproval = useRequestApproval();
  const [loginError, setLoginError] = useState<string | null>(null);

  const isLoggingIn = loginStatus === 'logging-in';
  const isAuthenticated = !!identity;

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      void navigate({ to: '/admin/dashboard' });
    } else if (isAuthenticated && isApproved && !approvalLoading) {
      void navigate({ to: '/team/dashboard' });
    }
  }, [isAuthenticated, isApproved, isAdmin, approvalLoading, navigate]);

  useEffect(() => {
    if (loginStatus === 'loginError') {
      setLoginError('Login failed. Please try again.');
    } else {
      setLoginError(null);
    }
  }, [loginStatus]);

  const handleLogin = () => {
    setLoginError(null);
    login();
  };

  const handleRequestApproval = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success('Approval request sent to admin!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request approval';
      toast.error(msg);
    }
  };

  // Pending state — authenticated but not approved
  if (isAuthenticated && !approvalLoading && !isApproved && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-cyan-pink shadow-cyan-glow mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gradient">B³</h1>
              <p className="text-muted-foreground text-sm mt-1">Bid Build Battle</p>
            </div>

            <div className="card-navy rounded-2xl p-8 shadow-card text-center">
              <div className="w-16 h-16 rounded-full bg-chart-4/10 border border-chart-4/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-chart-4" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Awaiting Approval</h2>
              <p className="text-muted-foreground text-sm mb-6">
                {profile?.name ? `Hi ${profile.name}, your` : 'Your'} team registration is pending admin approval.
                You'll be able to participate once approved.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleRequestApproval}
                  disabled={requestApproval.isPending}
                  className="w-full gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90"
                >
                  {requestApproval.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Request...
                    </span>
                  ) : (
                    'Request Approval'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => { await clear(); }}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-cyan-pink shadow-cyan-glow mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient">B³</h1>
            <p className="text-muted-foreground text-sm mt-1">Bid Build Battle</p>
          </div>

          <div className="card-navy rounded-2xl p-8 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Team Login</h2>
                <p className="text-xs text-muted-foreground">Sign in to participate in the auction</p>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{loginError}</p>
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || isInitializing}
              className="w-full h-12 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              ) : isInitializing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing...
                </span>
              ) : (
                'Login with Internet Identity'
              )}
            </Button>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-3">Don't have a team yet?</p>
              <Button
                variant="outline"
                onClick={() => void navigate({ to: '/team/register' })}
                className="w-full border-border text-muted-foreground hover:text-foreground"
              >
                Register a Team
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
