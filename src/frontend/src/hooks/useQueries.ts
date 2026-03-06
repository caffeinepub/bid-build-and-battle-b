import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AuctionStatus,
  type ExternalBlob,
  type Player,
  PlayerCategory,
  PlayerRole,
  type Team,
  type UserApprovalInfo,
  type UserProfile,
} from "../backend";
import { useActor } from "./useActor";

export { AuctionStatus, PlayerRole, PlayerCategory };

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Auth / Approval ─────────────────────────────────────────────────────────

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerApproved"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

export function useAdminLogin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (passcode: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminAuthenticate(passcode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

// ─── Players ─────────────────────────────────────────────────────────────────

export function useGetPlayers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[bigint, Player]>>({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayers();
    },
    enabled: !!actor && !actorFetching,
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
      if (!actor) throw new Error("Actor not available");
      return actor.addPlayer(
        params.name,
        params.role,
        params.category,
        params.basePrice,
        params.stats,
        params.photo,
        params.isDeletable,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function useDeletePlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePlayer(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export function useGetTeams() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTeams();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useRegisterTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      owner: string;
      email: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.registerTeam(params.name, params.owner, params.email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useApproveTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveTeam(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useRejectTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectTeam(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useApproveAllTeams() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveAllTeams();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useRejectAllTeams() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectAllTeams();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

// ─── Auction ──────────────────────────────────────────────────────────────────

export function useCurrentAuctionState() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AuctionStatus | null>({
    queryKey: ["currentAuctionState"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentAuctionState();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 3000,
  });
}

export function useCurrentPlayer() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Player | null>({
    queryKey: ["currentPlayer"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.currentPlayer();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 3000,
  });
}

export function useUpdateAuctionState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: AuctionStatus) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateAuctionState(state);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentAuctionState"] });
    },
  });
}

export function useUpdateCurrentPlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCurrentPlayer(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentPlayer"] });
    },
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
      if (!actor) throw new Error("Actor not available");
      return actor.createAuction(
        params.name,
        params.dateTime,
        params.budget,
        params.increment,
        params.minSquadSize,
        params.maxSquadSize,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

// ─── Approvals (admin) ────────────────────────────────────────────────────────

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user: Principal;
      status: "approved" | "rejected" | "pending";
    }) => {
      if (!actor) throw new Error("Actor not available");
      const statusMap = {
        approved: { approved: null },
        rejected: { rejected: null },
        pending: { pending: null },
      } as any;
      return actor.setApproval(params.user, statusMap[params.status]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

export function useUpdatePlayerState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { playerId: bigint; isDeletable: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePlayerState(params.playerId, params.isDeletable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}
