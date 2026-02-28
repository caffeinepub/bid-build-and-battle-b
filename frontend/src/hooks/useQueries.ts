import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ExternalBlob, PlayerRole, PlayerCategory, AuctionStatus, UserRole } from '../backend';
import type { Player, Team, UserProfile, UserApprovalInfo } from '../backend';
import { Principal } from '@dfinity/principal';

export { PlayerRole, PlayerCategory, AuctionStatus, UserRole };
export type { Player, Team, UserProfile, UserApprovalInfo };

// ─── Players ────────────────────────────────────────────────────────────────

export function useGetPlayers() {
  const { actor, isFetching } = useActor();
  return useQuery<[bigint, Player][]>({
    queryKey: ['players'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      role: PlayerRole;
      category: PlayerCategory;
      basePrice: bigint;
      stats: string | null;
      photo: ExternalBlob;
      isDeletable: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addPlayer(
        data.name,
        data.role,
        data.category,
        data.basePrice,
        data.stats,
        data.photo,
        data.isDeletable
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useDeletePlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePlayer(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useUpdatePlayerState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playerId, isDeletable }: { playerId: bigint; isDeletable: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlayerState(playerId, isDeletable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function useGetTeams() {
  const { actor, isFetching } = useActor();
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRegisterTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; owner: string; email: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerTeam(data.name, data.owner, data.email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useApproveTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveTeam(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRejectTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectTeam(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useApproveAllTeams() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveAllTeams();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRejectAllTeams() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectAllTeams();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useGetCallerTeam() {
  const { actor, isFetching } = useActor();
  return useQuery<Team | null>({
    queryKey: ['callerTeam'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        // We need a team name — this is a placeholder; actual usage passes name
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Auction ─────────────────────────────────────────────────────────────────

export function useCurrentAuctionState() {
  const { actor, isFetching } = useActor();
  return useQuery<AuctionStatus | null>({
    queryKey: ['auctionState'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentAuctionState();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useCurrentPlayer() {
  const { actor, isFetching } = useActor();
  return useQuery<Player | null>({
    queryKey: ['currentPlayer'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentPlayer();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useUpdateAuctionState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: AuctionStatus) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateAuctionState(state);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctionState'] });
    },
  });
}

export function useUpdateCurrentPlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCurrentPlayer(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentPlayer'] });
    },
  });
}

export function useCreateAuction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      dateTime: bigint;
      budget: bigint;
      increment: bigint;
      minSquadSize: bigint;
      maxSquadSize: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createAuction(
        data.name,
        data.dateTime,
        data.budget,
        data.increment,
        data.minSquadSize,
        data.maxSquadSize
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

// ─── Auth / Admin ─────────────────────────────────────────────────────────────

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    gcTime: 0,
  });
}

// Alias for backward compatibility
export const useIsCallerAdmin = useIsAdmin;

export function useMyRole() {
  const { actor, isFetching } = useActor();
  return useQuery<UserRole>({
    queryKey: ['myRole'],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.myRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminLogin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (passcode: string) => {
      if (!actor) throw new Error('Actor not available');
      // Call adminLogin — this registers the current actor's principal as admin
      await actor.adminLogin(passcode);
      // Store the admin session flag in localStorage so we know admin is logged in
      localStorage.setItem('adminLoggedIn', 'true');
    },
    onSuccess: () => {
      // Invalidate isAdmin so it refetches and confirms admin status
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['myRole'] });
    },
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: any }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}
