import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminLogin } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Lock, Shield } from 'lucide-react';

function getFriendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('Incorrect passcode')) {
    return 'Incorrect passcode. Please try again.';
  }

  // IC canister stopped / replica rejection errors
  if (
    raw.includes('IC0508') ||
    raw.includes('canister is stopped') ||
    raw.includes('Canister') ||
    raw.includes('replica') ||
    raw.includes('rejection') ||
    raw.includes('Request ID') ||
    raw.includes('non_replicated_rejection') ||
    raw.includes('reject_code')
  ) {
    return 'Service temporarily unavailable. Please try again in a moment.';
  }

  // Network / fetch errors
  if (
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('network')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Generic fallback — avoid leaking raw internals
  if (raw.length > 120 || raw.includes('{') || raw.includes('http')) {
    return 'Login failed. Please try again.';
  }

  return raw || 'Login failed. Please try again.';
}

export default function AdminLogin() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const adminLogin = useAdminLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passcode.trim()) {
      setError('Please enter the admin passcode');
      return;
    }

    if (!actor) {
      setError('Connection not ready. Please wait a moment and try again.');
      return;
    }

    try {
      await adminLogin.mutateAsync(passcode.trim());
      // Invalidate all queries so they refetch with admin privileges
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['myRole'] });
      navigate({ to: '/admin/dashboard' });
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">IPL Auction Management System</p>
        </div>

        <Card className="border-border/50 shadow-lg">
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
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={adminLogin.isPending}
                  autoFocus
                  className="font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={adminLogin.isPending || !actor}
              >
                {adminLogin.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Team owners?{' '}
          <button
            onClick={() => navigate({ to: '/team/login' })}
            className="text-primary hover:underline"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
