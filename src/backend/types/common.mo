module {
  public type GameId = Text;
  public type PlayerId = Text;
  public type TeamId = Text;
  public type Timestamp = Int;

  public type ApiError = {
    #networkError : Text;
    #parseError : Text;
    #notFound : Text;
    #rateLimited : Text;
    #unavailable : Text;
  };

  public type Result<T> = {
    #ok : T;
    #err : ApiError;
  };

  public type ApiStatus = {
    oddsApiConfigured : Bool;
    openAiConfigured : Bool;
    bdlApiConfigured : Bool;
    lastOddsApiCallStatus : ?Text;
    lastBdlCallStatus : ?Text;
  };
}
