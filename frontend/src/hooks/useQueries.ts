import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Player, Team, UserApprovalInfo } from '../backend';
import { PlayerRole, PlayerCategory, AuctionStatus, UserRole, TeamStatus } from '../backend';
import { ExternalBlob } from '../backend';
import type { Principal } from '@dfinity/principal';

export { PlayerRole, PlayerCategory, AuctionStatus, UserRole, TeamStatus };

// ApprovalStatus is used by setApproval in the backend but not exported from backend.d.ts
// Define it locally to match what the backend expects
export type ApprovalStatus = { approved: null } | { rejected: null } | { pending: null };

// ─── Auth / Profile ──────────────────────────────────────────────────────────

export function useMyRole() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['myRole', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.myRole();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
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

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['isCallerApproved', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 10_000,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['isCallerAdmin', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      try {
        // Try isCallerAdmin first (generated interface), fall back to isAdmin
        if (typeof actor.isCallerAdmin === 'function') {
          return await actor.isCallerAdmin();
        }
        return await actor.isAdmin();
      } catch {
        try {
          return await actor.isAdmin();
        } catch {
          return false;
        }
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 30_000,
    retry: 1,
  });
}

// ─── Auction ─────────────────────────────────────────────────────────────────

export function useCurrentAuctionState() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AuctionStatus | null>({
    queryKey: ['currentAuctionState'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentAuctionState();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function useCreateAuction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      dateTime: bigint;
      budget: bigint;
      increment: bigint;
      minSquadSize: bigint;
      maxSquadSize: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createAuction(
        params.name,
        params.dateTime,
        params.budget,
        params.increment,
        params.minSquadSize,
        params.maxSquadSize
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentAuctionState'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['currentAuctionState'] });
    },
  });
}

// ─── Players ─────────────────────────────────────────────────────────────────

export function useGetPlayers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[bigint, Player]>>({
    queryKey: ['players'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayers();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useCurrentPlayer() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Player | null>({
    queryKey: ['currentPlayer'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentPlayer();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 2000,
    staleTime: 0,
  });
}

export function useAddPlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
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
        params.name,
        params.role,
        params.category,
        params.basePrice,
        params.stats,
        params.photo,
        params.isDeletable
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

export function useUpdatePlayerState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { playerId: bigint; isDeletable: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlayerState(params.playerId, params.isDeletable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function useGetTeams() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useRegisterTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; owner: string; email: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerTeam(params.name, params.owner, params.email);
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

// ─── Approvals ───────────────────────────────────────────────────────────────

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10_000,
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

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(params.user, params.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignCallerUserRole(params.user, params.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRole'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
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
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Team | null>({
    queryKey: ['callerTeam', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        const teams = await actor.getTeams();
        const principalStr = identity.getPrincipal().toString();
        const myTeam = teams.find(
          (t) => t.ownerPrincipal?.toString() === principalStr
        );
        return myTeam ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 10_000,
  });
}
