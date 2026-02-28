import Int "mo:core/Int";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Migration "migration";

(with migration = Migration.run)
actor {
  type AuctionId = Nat;
  type TeamStatus = {
    #pending;
    #approved;
    #rejected;
  };
  type PlayerRole = {
    #batsman;
    #bowler;
    #allRounder;
    #wicketKeeper;
  };
  type PlayerCategory = {
    #cappedIndian;
    #uncappedIndian;
    #foreign;
  };
  type Auction = {
    id : AuctionId;
    name : Text;
    dateTime : Int;
    budget : Nat;
    increment : Nat;
    minSquadSize : Nat;
    maxSquadSize : Nat;
    teams : [Text];
  };
  type AuctionStatus = {
    #notStarted;
    #live;
    #paused;
    #completed;
  };

  include MixinStorage();

  // Auctions Management
  let auctions = Map.empty<AuctionId, Auction>();
  var nextAuctionId = 100;

  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Approval Management
  let approvalState = UserApproval.initState(accessControlState);

  // User Profile
  public type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Registered Teams
  type Team = {
    name : Text;
    owner : Text;
    email : Text;
    registeredTime : Int;
    status : TeamStatus;
    ownerPrincipal : ?Principal;
  };

  let registeredTeams = Map.empty<Text, Team>();

  // Players Management
  type ForeignPlayerLimit = {
    maxCount : Nat;
    currentCount : Nat;
  };

  type Player = {
    name : Text;
    role : PlayerRole;
    category : PlayerCategory;
    basePrice : Nat;
    stats : ?Text;
    photo : Storage.ExternalBlob;
    isDeletable : Bool;
  };

  let players = Map.empty<Nat, Player>();
  var foreignPlayerLimit : ForeignPlayerLimit = {
    maxCount = 4;
    currentCount = 0;
  };
  var nextPlayerId = 0;

  // Auction Current State
  var _currentAuctionState : ?AuctionStatus = null;
  var _currentPlayer : ?Player = null;

  public query func currentAuctionState() : async ?AuctionStatus { _currentAuctionState };
  public query func currentPlayer() : async ?Player { _currentPlayer };

  public query ({ caller }) func myRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  /// Admin login using a passcode
  public shared ({ caller }) func adminLogin(passcode : Text) : async () {
    if (passcode != "sastra2026") {
      Runtime.trap("Incorrect passcode");
    };
    AccessControl.initialize(accessControlState, caller, "", "");
  };

  // Auction Setup — admin only
  public shared ({ caller }) func createAuction(name : Text, dateTime : Int, budget : Nat, increment : Nat, minSquadSize : Nat, maxSquadSize : Nat) : async AuctionId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let auctionId = nextAuctionId;
    nextAuctionId += 1;

    let auction : Auction = {
      id = auctionId;
      name;
      dateTime;
      budget;
      increment;
      minSquadSize;
      maxSquadSize;
      teams = [];
    };

    auctions.add(auctionId, auction);
    auctionId;
  };

  // Team Registration — open to any authenticated user (team owners register themselves)
  public shared ({ caller }) func registerTeam(name : Text, owner : Text, email : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register a team");
    };
    let team : Team = {
      name;
      owner;
      email;
      registeredTime = Time.now();
      status = #pending;
      ownerPrincipal = ?caller;
    };
    registeredTeams.add(name, team);
  };

  // Admin-only: view all teams
  public query ({ caller }) func getTeams() : async [Team] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    registeredTeams.values().toArray();
  };

  // Admin or the team owner can view a specific team
  public query ({ caller }) func getTeam(name : Text) : async Team {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    // Allow admin or the team's own owner
    let isOwner = switch (team.ownerPrincipal) {
      case (?p) { p == caller };
      case (null) { false };
    };
    if (not AccessControl.isAdmin(accessControlState, caller) and not isOwner) {
      Runtime.trap("Unauthorized: Can only view your own team");
    };
    team;
  };

  // Admin-only: approve a team
  public shared ({ caller }) func approveTeam(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    registeredTeams.add(name, { team with status = #approved });
  };

  // Admin-only: reject a team
  public shared ({ caller }) func rejectTeam(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    registeredTeams.add(name, { team with status = #rejected });
  };

  // Admin-only: add a player
  public shared ({ caller }) func addPlayer(name : Text, role : PlayerRole, category : PlayerCategory, basePrice : Nat, stats : ?Text, photo : Storage.ExternalBlob, isDeletable : Bool) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let playerId = nextPlayerId;
    nextPlayerId += 1;

    let player : Player = {
      name;
      role;
      category;
      basePrice;
      stats;
      photo;
      isDeletable;
    };

    players.add(playerId, player);

    // Correctly increment foreign player count if applicable
    if (category == #foreign) {
      if (foreignPlayerLimit.currentCount + 1 > foreignPlayerLimit.maxCount) {
        Runtime.trap("Cannot add more foreign players, limit reached");
      };
      foreignPlayerLimit := {
        foreignPlayerLimit with currentCount = foreignPlayerLimit.currentCount + 1;
      };
    };

    playerId;
  };

  // Admin-only: delete a player (only if deletable)
  public shared ({ caller }) func deletePlayer(playerId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) {
        if (not (player.isDeletable)) { Runtime.trap("Player cannot be deleted at this stage") };
        if (player.category == #foreign) {
          foreignPlayerLimit := {
            foreignPlayerLimit with currentCount = foreignPlayerLimit.currentCount - 1;
          };
        };
      };
    };
    players.remove(playerId);
  };

  // Public: anyone can view players (needed for /watch page and team dashboard)
  public query func getPlayers() : async [(Nat, Player)] {
    players.toArray();
  };

  // Public: anyone can view a specific player
  public query func getPlayer(id : Nat) : async Player {
    switch (players.get(id)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) { player };
    };
  };

  // Admin-only: update auction state
  public shared ({ caller }) func updateAuctionState(state : AuctionStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    _currentAuctionState := ?state;
  };

  // Admin-only: set current player on auction
  public shared ({ caller }) func updateCurrentPlayer(playerId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let player = switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?p) { p };
    };
    _currentPlayer := ?player;
  };

  // Admin-only: update player deletable state
  public shared ({ caller }) func updatePlayerState(playerId : Nat, isDeletable : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let updatedPlayer = switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) { { player with isDeletable } };
    };
    players.add(playerId, updatedPlayer);
  };

  // Approval System
  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.isAdmin(accessControlState, caller) or UserApproval.isApproved(approvalState, caller);
  };

  // Any authenticated user can request approval
  public shared ({ caller }) func requestApproval() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can request approval");
    };
    UserApproval.requestApproval(approvalState, caller);
  };

  // Admin-only: set approval status for a user
  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  // Admin-only: list all approval requests
  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // Team owner or admin: get caller's own team
  public query ({ caller }) func getCallerTeam(name : Text) : async Team {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    let isOwner = switch (team.ownerPrincipal) {
      case (?p) { p == caller };
      case (null) { false };
    };
    if (not AccessControl.isAdmin(accessControlState, caller) and not isOwner) {
      Runtime.trap("Unauthorized: Can only view your own team");
    };
    team;
  };

  // Admin-only: approve all teams at once
  public shared ({ caller }) func approveAllTeams() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    for ((name, team) in registeredTeams.entries()) {
      registeredTeams.add(name, { team with status = #approved });
    };
  };

  // Admin-only: reject all teams at once
  public shared ({ caller }) func rejectAllTeams() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    for ((name, team) in registeredTeams.entries()) {
      registeredTeams.add(name, { team with status = #rejected });
    };
  };
};
