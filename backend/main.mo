import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Blob "mo:core/Blob";
import Iter "mo:core/Iter";
import Migration "migration";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

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

  // Owner (admin) management — first authenticated caller becomes admin
  var owner : ?Principal = null;

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

  module Team {
    public func compare(team1 : Team, team2 : Team) : Order.Order {
      switch (Int.compare(team1.registeredTime, team2.registeredTime)) {
        case (#equal) { Text.compare(team1.name, team2.name) };
        case (order) { order };
      };
    };
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

  // Public: anyone (including /watch page viewers) can read auction state
  public query func currentAuctionState() : async ?AuctionStatus { _currentAuctionState };

  // Public: anyone (including /watch page viewers) can read current player
  public query func currentPlayer() : async ?Player { _currentPlayer };

  var _currentPlayer : ?Player = null;

  public query ({ caller }) func myRole() : async AccessControl.UserRole {
    switch (owner) {
      case (?o) {
        if (caller == o) { return #admin };
      };
      case (null) { () };
    };
    #user;
  };

  // Check admin status based solely on stored owner principal
  public query ({ caller }) func isAdmin() : async Bool {
    switch (owner) {
      case (?o) { caller == o };
      case (null) { false };
    };
  };

  // Auction Setup — admin only
  public shared ({ caller }) func createAuction(name : Text, dateTime : Int, budget : Nat, increment : Nat, minSquadSize : Nat, maxSquadSize : Nat) : async AuctionId {
    guardIsAdmin(caller);
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
    guardIsAdmin(caller);
    registeredTeams.values().toArray().sort();
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
    if (not callerIsAdmin(caller) and not isOwner) {
      Runtime.trap("Unauthorized: Can only view your own team");
    };
    team;
  };

  // Admin-only: approve a team
  public shared ({ caller }) func approveTeam(name : Text) : async () {
    guardIsAdmin(caller);
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    registeredTeams.add(name, { team with status = #approved });
  };

  // Admin-only: reject a team
  public shared ({ caller }) func rejectTeam(name : Text) : async () {
    guardIsAdmin(caller);
    let team = switch (registeredTeams.get(name)) {
      case (null) { Runtime.trap("Team does not exist") };
      case (?t) { t };
    };
    registeredTeams.add(name, { team with status = #rejected });
  };

  // Admin-only: add a player
  public shared ({ caller }) func addPlayer(name : Text, role : PlayerRole, category : PlayerCategory, basePrice : Nat, stats : ?Text, photo : Storage.ExternalBlob, isDeletable : Bool) : async Nat {
    guardIsAdmin(caller);
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

    if (category == #foreign and isDeletable) {
      foreignPlayerLimit := {
        foreignPlayerLimit with currentCount = foreignPlayerLimit.currentCount + 1;
      };
    };

    playerId;
  };

  // Admin-only: delete a player (only if deletable)
  public shared ({ caller }) func deletePlayer(playerId : Nat) : async () {
    guardIsAdmin(caller);
    switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) {
        if (not (player.isDeletable)) { Runtime.trap("Player cannot be deleted at this stage") };
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
    guardIsAdmin(caller);
    _currentAuctionState := ?state;
  };

  // Admin-only: set current player on auction
  public shared ({ caller }) func updateCurrentPlayer(playerId : Nat) : async () {
    guardIsAdmin(caller);
    let player = switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?p) { p };
    };
    _currentPlayer := ?player;
  };

  // Admin-only: update player deletable state
  public shared ({ caller }) func updatePlayerState(playerId : Nat, isDeletable : Bool) : async () {
    guardIsAdmin(caller);
    let updatedPlayer = switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) { { player with isDeletable } };
    };
    players.add(playerId, updatedPlayer);
  };

  // Approval System
  public query ({ caller }) func isCallerApproved() : async Bool {
    callerIsAdmin(caller) or UserApproval.isApproved(approvalState, caller);
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
    guardIsAdmin(caller);
    UserApproval.setApproval(approvalState, user, status);
  };

  // Admin-only: list all approval requests
  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    guardIsAdmin(caller);
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
    if (not callerIsAdmin(caller) and not isOwner) {
      Runtime.trap("Unauthorized: Can only view your own team");
    };
    team;
  };

  // Admin-only: approve all teams at once
  public shared ({ caller }) func approveAllTeams() : async () {
    guardIsAdmin(caller);
    for ((name, team) in registeredTeams.entries()) {
      registeredTeams.add(name, { team with status = #approved });
    };
  };

  // Admin-only: reject all teams at once
  public shared ({ caller }) func rejectAllTeams() : async () {
    guardIsAdmin(caller);
    for ((name, team) in registeredTeams.entries()) {
      registeredTeams.add(name, { team with status = #rejected });
    };
  };

  // Returns true if caller is the stored admin owner
  func callerIsAdmin(caller : Principal) : Bool {
    switch (owner) {
      case (?o) { caller == o };
      case (null) { false };
    };
  };

  // Guards admin-only actions.
  // If no owner is set yet, the first authenticated (non-anonymous) caller becomes admin.
  func guardIsAdmin(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot become admin");
    };
    switch (owner) {
      case (null) {
        // First authenticated caller becomes the admin/owner
        owner := ?caller;
        return;
      };
      case (?o) {
        if (caller == o) { return };
      };
    };
    Runtime.trap("Unauthorized: Only admins can perform this action");
  };
};
