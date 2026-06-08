import HistoryTypes "types/history";
import CommonTypes "types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Array "mo:core/Array";

// Minimal state-only canister — all API calls happen in the frontend browser.
// Cycle consumption is near-zero: no HTTP outcalls, pure key/value storage.
actor {
  // ── Stable state ──────────────────────────────────────────────────────────
  let betHistory : Map.Map<Text, HistoryTypes.BetRecommendation> = Map.empty();

  // Line movement: gameId → "spread|total|hml" snapshot at open
  let lineOpenStore : Map.Map<Text, Text> = Map.empty();

  // Retained for stable variable compatibility with previous canister version.
  let OPENAI_API_KEY : Text = "";

  // ── Bet history ───────────────────────────────────────────────────────────

  public func saveBetRecommendation(rec : HistoryTypes.BetRecommendation) : async CommonTypes.Result<Text> {
    betHistory.add(rec.id, rec);
    #ok(rec.id);
  };

  public query func getBetHistory() : async [HistoryTypes.BetRecommendation] {
    let arr = collectBets();
    Array.sort(arr, func(a : HistoryTypes.BetRecommendation, b : HistoryTypes.BetRecommendation) : {#less; #equal; #greater} {
      if (a.recommendedAt > b.recommendedAt) #less
      else if (a.recommendedAt < b.recommendedAt) #greater
      else #equal
    });
  };

  public func updateBetOutcome(id : Text, status : HistoryTypes.BetStatus, gameResult : ?Text) : async CommonTypes.Result<Bool> {
    switch (betHistory.get(id)) {
      case null #err(#notFound("Bet " # id # " not found"));
      case (?existing) {
        betHistory.add(id, { existing with status; gameResult; updatedAt = ?(Time.now()) });
        #ok(true);
      };
    };
  };

  public func updateClosingLine(id : Text, closingLine : Text, preGameLine : Text) : async CommonTypes.Result<Bool> {
    switch (betHistory.get(id)) {
      case null #err(#notFound("Bet " # id # " not found"));
      case (?existing) {
        let clvScore : ?Float = computeClv(preGameLine, closingLine, existing.betType);
        betHistory.add(id, { existing with closingLine = ?closingLine; clvScore; updatedAt = ?(Time.now()) });
        #ok(true);
      };
    };
  };

  public query func getBetHistoryStats() : async HistoryTypes.BetHistoryStats {
    var total = 0; var won = 0; var lost = 0; var pending = 0;
    for ((_, rec) in betHistory.entries()) {
      total += 1;
      switch (rec.status) {
        case (#won) { won += 1 };
        case (#lost) { lost += 1 };
        case (#pending) { pending += 1 };
        case _ {};
      };
    };
    let winRate : Float = if (won + lost == 0) 0.0
      else won.toFloat() / (won + lost).toFloat() * 100.0;
    { totalBets = total; wonBets = won; lostBets = lost; pendingBets = pending; winRate };
  };

  // ── Line movement ─────────────────────────────────────────────────────────

  public func recordOpeningLine(gameId : Text, spread : Text, total : Text, homeML : Text) : async () {
    switch (lineOpenStore.get(gameId)) {
      case null { lineOpenStore.add(gameId, spread # "|" # total # "|" # homeML) };
      case _ {};  // never overwrite opening line
    };
  };

  public query func getOpeningLine(gameId : Text) : async ?Text {
    lineOpenStore.get(gameId);
  };

  // ── Status ────────────────────────────────────────────────────────────────

  public query func getApiStatus() : async CommonTypes.ApiStatus {
    { oddsApiConfigured = true; openAiConfigured = true; bdlApiConfigured = true;
      lastOddsApiCallStatus = null; lastBdlCallStatus = null };
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  private func collectBets() : [HistoryTypes.BetRecommendation] {
    var result : [HistoryTypes.BetRecommendation] = [];
    for ((_, rec) in betHistory.entries()) {
      result := Array.tabulate<HistoryTypes.BetRecommendation>(result.size() + 1, func(i) {
        if (i < result.size()) result[i] else rec
      });
    };
    result;
  };

  private func computeClv(preGameOdds : Text, closingLine : Text, betType : HistoryTypes.BetType) : ?Float {
    let pg = parseFloat(preGameOdds);
    let cl = parseFloat(closingLine);
    switch (pg, cl) {
      case (?p, ?c) {
        switch betType {
          case (#spread) ?(p - c);
          case (#gameTotal) ?(c - p);
          case _ null;
        };
      };
      case _ null;
    };
  };

  private func parseFloat(t : Text) : ?Float {
    var neg = false;
    var s = t;
    if (s.size() > 0 and s.chars().next() == ?'-') {
      neg := true;
      s := s.trimStart(#char '-');
    };
    var intPart : Float = 0.0;
    var fracPart : Float = 0.0;
    var fracDiv : Float = 1.0;
    var inFrac = false;
    for (c in s.chars()) {
      if (c == '.') { inFrac := true }
      else if (c >= '0' and c <= '9') {
        let d = Float.fromInt(c.toNat32() - 48 : Nat32 |> _.toNat());
        if (inFrac) { fracDiv *= 10.0; fracPart += d / fracDiv }
        else { intPart := intPart * 10.0 + d };
      };
    };
    let result = intPart + fracPart;
    if (neg) ?(-result) else ?(result);
  };
};
