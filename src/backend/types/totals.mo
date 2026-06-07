import CommonTypes "common";

module {
  public type ScoringTrend = {
    date : Text;
    teamTotal : Float;
    gameTotal : Float;
    opponent : Text;
    overUnder : Float;
    result : Text;
  };

  public type RefereeProfile = {
    name : Text;
    avgFoulsPerGame : ?Float;
    avgFreeThrowsPerGame : ?Float;
    overRate : ?Float;
    tendency : Text;
  };

  public type PaceProfile = {
    teamId : CommonTypes.TeamId;
    pace : Float;
    offensiveEfficiency : Float;
    defensiveEfficiency : Float;
    avgPointsFor : Float;
    avgPointsAgainst : Float;
    last5Avg : Float;
  };

  public type GameTotal = {
    gameId : CommonTypes.GameId;
    homePace : PaceProfile;
    awayPace : PaceProfile;
    impliedTotal : ?Float;
    projectedTotal : ?Float;
    recentTrends : [ScoringTrend];
    refereeProfile : ?RefereeProfile;
    injuryImpact : Text;
    confidenceReport : ?TotalsConfidenceReport;
  };

  public type TotalsConfidenceReport = {
    score : Nat;
    grade : Text;
    reasoning : Text;
    keyFactors : [Text];
    recommendation : Text;
    projectedTotal : ?Float;
    overUnderEdge : Text;
  };
}
