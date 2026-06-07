import CommonTypes "common";

module {
  public type BetType = {
    #playerProp;
    #gameTotal;
    #spread;
  };

  public type BetStatus = {
    #pending;
    #won;
    #lost;
    #push;
    #cancelled;
  };

  public type BetRecommendation = {
    id : Text;
    gameId : CommonTypes.GameId;
    homeTeam : Text;
    awayTeam : Text;
    gameDate : Text;
    betType : BetType;
    description : Text;
    confidence : Nat;
    reasoning : Text;
    recommendedAt : Int;
    preGameOdds : ?Text;
    result : ?Text;
    status : BetStatus;
    gameResult : ?Text;
    updatedAt : ?Int;
    closingLine : ?Text;   // recorded after market closes for CLV tracking
    clvScore : ?Float;     // positive = beat closing line (winning process signal)
  };

  public type BetHistoryStats = {
    totalBets : Nat;
    wonBets : Nat;
    lostBets : Nat;
    pendingBets : Nat;
    winRate : Float;
  };
}
