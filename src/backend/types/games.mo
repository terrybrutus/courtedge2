import CommonTypes "common";

module {
  public type GameStatus = {
    #scheduled;
    #inProgress;
    #final;
    #postponed;
  };

  public type Team = {
    id : CommonTypes.TeamId;
    name : Text;
    abbreviation : Text;
    city : Text;
    record : Text;
  };

  public type Game = {
    id : CommonTypes.GameId;
    homeTeam : Team;
    awayTeam : Team;
    gameTime : Text;
    displayTime : Text;
    status : GameStatus;
    venue : Text;
    series : ?Text;
    odds : [OddsLine];
  };

  public type InjuryReport = {
    playerId : CommonTypes.PlayerId;
    playerName : Text;
    team : Text;
    status : Text;
    description : Text;
    updatedAt : Text;
  };

  public type OddsLine = {
    bookmaker : Text;
    homeMoneyline : ?Int;
    awayMoneyline : ?Int;
    homeSpread : ?Float;
    awaySpread : ?Float;
    homeSpreadOdds : ?Int;
    awaySpreadOdds : ?Int;
    overUnder : ?Float;
    overOdds : ?Int;
    underOdds : ?Int;
    updatedAt : Text;
  };

  public type Discrepancy = {
    betType : Text;
    minValue : Float;
    maxValue : Float;
    minBook : Text;
    maxBook : Text;
    gap : Float;
  };

  public type ConfidenceReport = {
    score : Nat;
    grade : Text;
    reasoning : Text;
    keyFactors : [Text];
    recommendation : Text;
  };

  public type GameInvestigation = {
    game : Game;
    homeTeamStats : TeamStats;
    awayTeamStats : TeamStats;
    injuries : [InjuryReport];
    odds : [OddsLine];
    discrepancies : [Discrepancy];
  };

  public type TeamStats = {
    teamId : CommonTypes.TeamId;
    offensiveRating : ?Float;
    defensiveRating : ?Float;
    pace : ?Float;
    pointsPerGame : ?Float;
    recentForm : [Nat];
    homeAwayRecord : Text;
    restDays : Nat;
  };

  // Wraps the games list with metadata about which date they are from.
  public type GamesResponse = {
    games : [Game];
    gamesDate : Text;      // YYYY-MM-DD of the games being shown
    isUpcomingDate : Bool; // true when date != today (upcoming search result)
  };
}
