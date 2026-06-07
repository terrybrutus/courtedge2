import CommonTypes "common";
import TotalTypes "totals";

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

  // Line movement from opening to current — stored per game in actor state
  public type LineMovement = {
    openingSpread : ?Float;
    currentSpread : ?Float;
    spreadMove : Float;      // positive = moved toward home (home gave fewer points)
    openingTotal : ?Float;
    currentTotal : ?Float;
    totalMove : Float;       // positive = total moved up
    steamAlert : Bool;       // true if 1.5+ spread move or 3+ total move
    sharpSide : Text;        // "HOME", "AWAY", or "NONE"
  };

  // Rest advantage between the two teams
  public type RestAdvantage = {
    homeRestDays : Nat;
    awayRestDays : Nat;
    advantage : Text;           // "HOME", "AWAY", or "NONE"
    impactDescription : Text;
  };

  // Rule-based situational betting angle
  public type SituationalAngle = {
    name : Text;
    description : Text;
    edge : Text;
    confidence : Nat;
  };

  public type GameInvestigation = {
    game : Game;
    homeTeamStats : TeamStats;
    awayTeamStats : TeamStats;
    injuries : [InjuryReport];
    odds : [OddsLine];
    discrepancies : [Discrepancy];
    lineMovement : ?LineMovement;
    restAdvantage : ?RestAdvantage;
    situationalAngles : [SituationalAngle];
    refereeProfile : ?TotalTypes.RefereeProfile;
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
    gamesDate : Text;
    isUpcomingDate : Bool;
  };
}
