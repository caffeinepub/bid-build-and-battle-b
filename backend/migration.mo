import Map "mo:core/Map";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Blob "mo:core/Blob";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

module {
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

  type ForeignPlayerLimit = {
    maxCount : Nat;
    currentCount : Nat;
  };

  type Team = {
    name : Text;
    owner : Text;
    email : Text;
    registeredTime : Int;
    status : TeamStatus;
    ownerPrincipal : ?Principal;
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

  type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
  };

  type OldActor = {
    auctions : Map.Map<AuctionId, Auction>;
    nextAuctionId : Nat;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    registeredTeams : Map.Map<Text, Team>;
    players : Map.Map<Nat, Player>;
    foreignPlayerLimit : ForeignPlayerLimit;
    nextPlayerId : Nat;
    _currentAuctionState : ?AuctionStatus;
    _currentPlayer : ?Player;
    approvalState : UserApproval.UserApprovalState;
  };

  type NewActor = {
    auctions : Map.Map<AuctionId, Auction>;
    nextAuctionId : Nat;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    registeredTeams : Map.Map<Text, Team>;
    players : Map.Map<Nat, Player>;
    foreignPlayerLimit : ForeignPlayerLimit;
    nextPlayerId : Nat;
    _currentAuctionState : ?AuctionStatus;
    _currentPlayer : ?Player;
    approvalState : UserApproval.UserApprovalState;
    owner : ?Principal;
  };

  public func run(old : OldActor) : NewActor {
    {
      old
      with
      owner = null;
    };
  };
};
