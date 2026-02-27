import React, { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useRegisterTeam, useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { Users, Trophy, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppFooter from '../components/AppFooter';
import { toast } from 'sonner';

interface FormErrors {
  teamName?: string;
  ownerName?: string;
  email?: string;
}

export default function TeamRegister() {
  const navigate = useNavigate();

  // Safely read the auction query param
  let auctionId: string | null = null;
  try {
    const search = useSearch({ strict: false }) as Record<string, string>;
    auctionId = search?.auction ?? null;
  } catch {
    auctionId = null;
  }

  const { identity, login, loginStatus, isInitializing } = useInternetIdentity();
  const registerTeam = useRegisterTeam();
  const saveProfile = useSaveCallerUserProfile();

  const [teamName, setTeamName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [registered, setRegistered] = useState(false);

  const isLoggingIn = loginStatus === 'logging-in';
  const isAuthenticated = !!identity;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!teamName.trim()) newErrors.teamName = 'Team name is required';
    else if (teamName.trim().length < 3) newErrors.teamName = 'Team name must be at least 3 characters';
    if (!ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email address';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await saveProfile.mutateAsync({
        name: ownerName,
        email,
        role: 'team',
      });

      await registerTeam.mutateAsync({
        name: teamName.trim(),
        owner: ownerName.trim(),
        email: email.trim(),
      });

      setRegistered(true);
      toast.success('Team registered! Awaiting admin approval.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card-navy rounded-2xl p-8 shadow-card text-center">
              <div className="w-16 h-16 rounded-full bg-chart-3/10 border border-chart-3/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-chart-3" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Registration Successful!</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Your team <span className="text-cyan font-semibold">{teamName}</span> has been registered.
                Awaiting host approval before you can participate.
              </p>
              <div className="bg-chart-4/10 border border-chart-4/20 rounded-lg p-3 mb-6">
                <p className="text-xs text-chart-4">⏳ Awaiting host approval</p>
              </div>
              <Button
                onClick={() => void navigate({ to: '/team/login' })}
                className="w-full gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90"
              >
                Go to Team Login
              </Button>
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
            <p className="text-muted-foreground text-sm mt-1">Team Registration</p>
          </div>

          {auctionId && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan/10 border border-cyan/20 mb-4">
              <CheckCircle className="w-4 h-4 text-cyan flex-shrink-0" />
              <p className="text-sm text-cyan">Valid auction invite link detected</p>
            </div>
          )}

          {!auctionId && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-4/10 border border-chart-4/20 mb-4">
              <AlertCircle className="w-4 h-4 text-chart-4 flex-shrink-0" />
              <p className="text-sm text-chart-4">No auction ID found. You may still register.</p>
            </div>
          )}

          <div className="card-navy rounded-2xl p-8 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-pink/10 border border-pink/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Register Team</h2>
                <p className="text-xs text-muted-foreground">Create your auction team</p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  You need to login first to register a team.
                </p>
                <Button
                  onClick={login}
                  disabled={isLoggingIn || isInitializing}
                  className="w-full h-12 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Login with Internet Identity'
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="teamName" className="text-sm font-medium text-foreground">
                    Team Name <span className="text-pink">*</span>
                  </Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (errors.teamName) setErrors((p) => ({ ...p, teamName: undefined }));
                    }}
                    placeholder="e.g., Mumbai Mavericks"
                    className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan"
                  />
                  {errors.teamName && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.teamName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ownerName" className="text-sm font-medium text-foreground">
                    Owner Name <span className="text-pink">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (errors.ownerName) setErrors((p) => ({ ...p, ownerName: undefined }));
                    }}
                    placeholder="Your full name"
                    className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan"
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.ownerName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address <span className="text-pink">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="owner@example.com"
                    className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-cyan"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.email}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={registerTeam.isPending || saveProfile.isPending}
                  className="w-full h-12 gradient-cyan-pink text-white font-semibold rounded-xl hover:opacity-90 mt-2"
                >
                  {registerTeam.isPending || saveProfile.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </span>
                  ) : (
                    'Register Team'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                onClick={() => void navigate({ to: '/team/login' })}
                className="text-xs text-muted-foreground hover:text-cyan transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Team Login
              </button>
            </div>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
