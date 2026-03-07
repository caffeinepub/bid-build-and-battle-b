import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Player {
    name: string;
    role: PlayerRole;
    stats?: string;
    category: PlayerCategory;
    photo: ExternalBlob;
    isDeletable: boolean;
    basePrice: bigint;
}
export interface UserProfile {
    name: string;
    role: string;
    email: string;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export type AuctionId = bigint;
export interface Team {
    status: TeamStatus;
    owner: string;
    ownerPrincipal?: Principal;
    name: string;
    email: string;
    registeredTime: bigint;
}
export enum AuctionStatus {
    notStarted = "notStarted",
    live = "live",
    completed = "completed",
    paused = "paused"
}
export enum PlayerCategory {
    uncappedIndian = "uncappedIndian",
    cappedIndian = "cappedIndian",
    foreign = "foreign"
}
export enum PlayerRole {
    allRounder = "allRounder",
    bowler = "bowler",
    wicketKeeper = "wicketKeeper",
    batsman = "batsman"
}
export enum TeamStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPlayer(name: string, role: PlayerRole, category: PlayerCategory, basePrice: bigint, stats: string | null, photo: ExternalBlob, isDeletable: boolean): Promise<bigint>;
    /**
     * / Admin authentication using the new passcode "sastra2026"
     */
    adminAuthenticate(passcode: string): Promise<void>;
    approveAllTeams(): Promise<void>;
    approveTeam(name: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAuction(name: string, dateTime: bigint, budget: bigint, increment: bigint, minSquadSize: bigint, maxSquadSize: bigint): Promise<AuctionId>;
    currentAuctionState(): Promise<AuctionStatus | null>;
    currentPlayer(): Promise<Player | null>;
    deletePlayer(playerId: bigint): Promise<void>;
    getCallerTeam(name: string): Promise<Team>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPlayer(id: bigint): Promise<Player>;
    getPlayers(): Promise<Array<[bigint, Player]>>;
    getSharedAuctionState(): Promise<string>;
    getSharedPlayersData(): Promise<string>;
    getSharedRoomsData(): Promise<string>;
    getSharedTeamsData(): Promise<string>;
    getTeam(name: string): Promise<Team>;
    getTeams(): Promise<Array<Team>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    myRole(): Promise<UserRole>;
    registerTeam(name: string, owner: string, email: string): Promise<void>;
    rejectAllTeams(): Promise<void>;
    rejectTeam(name: string): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    /**
     * / Stores the complete auction state for cross-device sync.
     */
    saveSharedAuctionState(stateJson: string): Promise<void>;
    /**
     * / Stores the players data for the full auction state.
     */
    saveSharedPlayersData(playersJson: string): Promise<void>;
    /**
     * / Stores the rooms data for the full auction state.
     */
    saveSharedRoomsData(roomsJson: string): Promise<void>;
    /**
     * / Stores the teams data for the full auction state.
     */
    saveSharedTeamsData(teamsJson: string): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateAuctionState(state: AuctionStatus): Promise<void>;
    updateCurrentPlayer(playerId: bigint): Promise<void>;
    updatePlayerState(playerId: bigint, isDeletable: boolean): Promise<void>;
}
