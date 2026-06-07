import HistoryTypes "../types/history";
import CommonTypes "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

mixin () {
  let betHistory : Map.Map<Text, HistoryTypes.BetRecommendation> = Map.empty();

  // ── Write: save a new bet recommendation ──────────────────────────────────
  public func saveBetRecommendation(rec : HistoryTypes.BetRecommendation) : async CommonTypes.Result<Text> {
    betHistory.add(rec.id, rec);
    #ok(rec.id);
  };

  // ── Read: all bets sorted by recommendedAt descending ─────────────────────
  public query func getBetHistory() : async [HistoryTypes.BetRecommendation] {
    let arr = collectBetHistory();
    Array.sort(arr, func(a : HistoryTypes.BetRecommendation, b : HistoryTypes.BetRecommendation) : {#less; #equal; #greater} {
      if (a.recommendedAt > b.recommendedAt) #less
      else if (a.recommendedAt < b.recommendedAt) #greater
      else #equal
    });
  };

  // ── Write: update outcome for an existing bet ─────────────────────────────
  public func updateBetOutcome(id : Text, status : HistoryTypes.BetStatus, gameResult : ?Text) : async CommonTypes.Result<Bool> {
    switch (betHistory.get(id)) {
      case null #err(#notFound("Bet " # id # " not found"));
      case (?existing) {
        let updated : HistoryTypes.BetRecommendation = {
          existing with
          status;
          gameResult;
          updatedAt = ?(Time.now());
        };
        betHistory.add(id, updated);
        #ok(true);
      };
    };
  };

  // ── Read: aggregate win/loss stats ────────────────────────────────────────
  public query func getBetHistoryStats() : async HistoryTypes.BetHistoryStats {
    var total = 0;
    var won = 0;
    var lost = 0;
    var pending = 0;
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

  // ── Non-async helper callable from update functions (props-api, totals-api) ──
  func getHistoryContext() : Text {
    let arr = collectBetHistory();
    let sorted = Array.sort(arr, func(a : HistoryTypes.BetRecommendation, b : HistoryTypes.BetRecommendation) : {#less; #equal; #greater} {
      if (a.recommendedAt > b.recommendedAt) #less
      else if (a.recommendedAt < b.recommendedAt) #greater
      else #equal
    });
    let maxItems = if (sorted.size() > 20) 20 else sorted.size();
    var ctx = "";
    var i = 0;
    while (i < maxItems) {
      let rec = sorted[i];
      let outcomeStr = switch (rec.status) {
        case (#won) "WON";
        case (#lost) "LOST";
        case (#push) "PUSH";
        case (#cancelled) "CANCELLED";
        case (#pending) "PENDING";
      };
      ctx #= rec.gameDate # " " # rec.awayTeam # " @ " # rec.homeTeam #
        " | " # rec.description # " → " # outcomeStr #
        " (" # rec.confidence.toText() # "% confidence)\n";
      i += 1;
    };
    ctx;
  };

  // Collect map entries into an array
  private func collectBetHistory() : [HistoryTypes.BetRecommendation] {
    var size = 0;
    for (_ in betHistory.entries()) { size += 1 };
    var result : [HistoryTypes.BetRecommendation] = [];
    for ((_, rec) in betHistory.entries()) {
      result := Array.tabulate<HistoryTypes.BetRecommendation>(result.size() + 1, func(i) {
        if (i < result.size()) result[i] else rec
      });
    };
    result;
  };
};
