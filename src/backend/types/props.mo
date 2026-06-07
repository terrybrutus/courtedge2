import Debug "mo:core/Debug";
import CommonTypes "common";

module {
  public type Player = {
    id : CommonTypes.PlayerId;
    name : Text;
    team : Text;
    position : Text;
    jerseyNumber : Text;
    injuryStatus : Text;
  };

  public type PlayerRecentGame = {
    opponent : Text;
    points : Float;
    minutes : Float;
    usageRate : Float;
    fieldGoalAttempts : Float;
    date : Text;
  };

  public type PropLine = {
    bookmaker : Text;
    line : Float;
    overOdds : Int;
    underOdds : Int;
  };

  public type PlayerProp = {
    player : Player;
    seasonAvgPoints : Float;
    seasonAvgMinutes : Float;
    seasonUsageRate : Float;
    recentGames : [PlayerRecentGame];
    matchupDefRating : ?Float;
    propLines : [PropLine];
    homeAwaySplit : Float;
    backToBack : Bool;
    confidenceReport : ?ConfidenceReport;
  };

  public type ConfidenceReport = {
    score : Nat;
    grade : Text;
    reasoning : Text;
    keyFactors : [Text];
    recommendation : Text;
    projectedPoints : ?Float;
  };

  public type PlayerPropsAnalysis = {
    gameId : CommonTypes.GameId;
    players : [PlayerProp];
    analysisGeneratedAt : Text;
  };
}
