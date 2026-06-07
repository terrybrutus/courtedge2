import CommonTypes "../types/common";
import PropTypes "../types/props";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import GamesLib "../lib/games";

module {
  // Ball Don't Lie API — search player by name
  public func buildBdlPlayerSearchUrl(name : Text) : Text {
    "https://api.balldontlie.io/v1/players?search=" # name;
  };

  // Ball Don't Lie API — season averages for a player (2025 = 2024-25 season)
  public func buildBdlSeasonAvgUrl(playerId : Text) : Text {
    "https://api.balldontlie.io/v1/season_averages?season=2025&player_ids[]=" # playerId;
  };

  // Ball Don't Lie API — recent game stats for a player
  public func buildBdlRecentGamesUrl(playerId : Text) : Text {
    "https://api.balldontlie.io/v1/stats?seasons[]=2025&player_ids[]=" # playerId # "&per_page=10";
  };

  // Ball Don't Lie API — single game details (to extract team IDs for roster lookup)
  public func buildBdlSingleGameUrl(gameId : CommonTypes.GameId) : Text {
    "https://api.balldontlie.io/v1/games/" # gameId;
  };

  // Ball Don't Lie API — player roster for a team by numeric team ID
  public func buildBdlTeamRosterUrl(teamId : Text) : Text {
    "https://api.balldontlie.io/v1/players?team_ids[]=" # teamId # "&seasons[]=2025&per_page=12";
  };

  // Parse BDL single-game response to get (homeTeamId, awayTeamId) as Text.
  // Shape: {"data":{"id":..., "home_team":{"id":21,...}, "visitor_team":{"id":27,...},...}}
  public func parseBdlSingleGameTeamIds(json : Text) : ?(Text, Text) {
    if (not GamesLib.textContains(json, "\"data\"")) return null;
    let homeBlock = GamesLib.extractObjectAfterKey(json, "\"home_team\":");
    let visitorBlock = GamesLib.extractObjectAfterKey(json, "\"visitor_team\":");
    if (homeBlock == "" or visitorBlock == "") return null;
    let homeId = extractRawIntFromObj(homeBlock);
    let visitorId = extractRawIntFromObj(visitorBlock);
    if (homeId == "" or visitorId == "") return null;
    ?(homeId, visitorId)
  };

  // Parse BDL team roster response into Player array.
  // Shape: {"data":[{"id":10,"first_name":"Shai","last_name":"Gilgeous-Alexander","position":"G","team":{"abbreviation":"OKC"}}]}
  public func parseBdlTeamRoster(json : Text) : [PropTypes.Player] {
    if (not GamesLib.textContains(json, "\"data\"")) return [];
    let dataStart = switch (GamesLib.textIndexOf(json, "\"data\":")) {
      case null return [];
      case (?p) p;
    };
    let sub = textSubstringFrom(json, dataStart);
    let arrStart = switch (GamesLib.textIndexOf(sub, "[")) {
      case null return [];
      case (?p) p;
    };
    let playerBlocks = GamesLib.splitTopLevelArrayElements(textSubstringFrom(sub, arrStart));
    var players : [PropTypes.Player] = [];
    for (block in playerBlocks.vals()) {
      let playerId = extractRawIntFromObj(block);
      if (playerId != "") {
        let firstName = GamesLib.extractQuotedAfterKey(block, "\"first_name\":");
        let lastName = GamesLib.extractQuotedAfterKey(block, "\"last_name\":");
        let position = GamesLib.extractQuotedAfterKey(block, "\"position\":");
        let teamAbbr = GamesLib.extractQuotedAfterKey(block, "\"abbreviation\":");
        let name = if (firstName != "" and lastName != "") firstName # " " # lastName
                   else if (firstName != "") firstName
                   else lastName;
        if (name != "") {
          players := players.concat([{
            id = playerId;
            name;
            team = teamAbbr;
            position = if (position == "") "G" else position;
            jerseyNumber = "";
            injuryStatus = "Active";
          }]);
        };
      };
    };
    players
  };

  // Parse BDL player search response — return first matching player id.
  // Shape: {"data":[{"id":1,"first_name":"...","last_name":"...","team":{"abbreviation":"..."}}]}
  public func parseBdlPlayerId(json : Text, searchName : Text) : ?Text {
    ignore searchName;
    if (not GamesLib.textContains(json, "\"data\":")) return null;
    switch (GamesLib.textIndexOf(json, "\"id\":")) {
      case null null;
      case (?pos) {
        let sub = textSubstringFrom(json, pos + 5);
        let raw = extractRawToken(sub);
        if (raw == "") null else ?raw;
      };
    };
  };

  // Parse BDL season averages JSON into (pts, min, usageRate).
  // usageRate returned as a decimal (0.0–1.0), e.g. 0.28 for 28% usage.
  // Shape: {"data":[{"pts":22.5,"min":"34:20","ast":5.1,"reb":4.2,"fga":9.6,"fta":4.2,...}]}
  public func parseBdlSeasonAverages(json : Text) : (Float, Float, Float) {
    if (not GamesLib.textContains(json, "\"data\":")) return (0.0, 0.0, 0.0);
    let pts = parseFloatField(json, "\"pts\":");
    let fga = parseFloatField(json, "\"fga\":");
    let fta = parseFloatField(json, "\"fta\":");
    // Parse minutes: BDL returns "min" as "34:20" string (minutes:seconds)
    let minStr = GamesLib.extractQuotedAfterKey(json, "\"min\":");
    let minutes = if (minStr != "") parseMinutes(minStr) else 32.0;
    // Usage rate = (FGA + 0.44*FTA) / (team_possessions_per_game / 5)
    // Approximation: team averages ~100 possessions, each player on court ~48/48 * 100/5 = 20
    // Usage = (FGA + 0.44*FTA) / 20 * (48 / minutes) — simplified version
    let usageEst = if (fga > 0.0) {
      let rawUsage = (fga + 0.44 * fta) / 45.0;
      if (rawUsage > 0.45) 0.45 else rawUsage;
    } else 0.18;
    (pts, minutes, usageEst);
  };

  // Parse minutes string "34:20" → 34.33 (float minutes)
  func parseMinutes(s : Text) : Float {
    let chars = s.toArray();
    var mins = 0;
    var secs = 0;
    var i = 0;
    while (i < chars.size() and chars[i].toNat32() != 58) {
      let cn = chars[i].toNat32();
      if (cn >= 48 and cn <= 57) { mins := mins * 10 + (cn - 48).toNat() };
      i += 1;
    };
    if (i < chars.size()) { i += 1 };
    while (i < chars.size()) {
      let cn = chars[i].toNat32();
      if (cn >= 48 and cn <= 57) { secs := secs * 10 + (cn - 48).toNat() };
      i += 1;
    };
    mins.toFloat() + secs.toFloat() / 60.0
  };

  // Parse BDL game stats JSON into recent games array.
  // Shape: {"data":[{"pts":24,"min":"35:12","player":{"id":1,"first_name":"..."},"game":{"date":"..."}}]}
  public func parseBdlRecentGames(json : Text) : [PropTypes.PlayerRecentGame] {
    if (not GamesLib.textContains(json, "\"data\":")) return [];
    let dataStart = switch (GamesLib.textIndexOf(json, "\"data\":")) {
      case null return [];
      case (?pos) pos;
    };
    let sub = textSubstringFrom(json, dataStart);
    let arrStart = switch (GamesLib.textIndexOf(sub, "[")) {
      case null return [];
      case (?p) p;
    };
    let gameBlocks = GamesLib.splitTopLevelArrayElements(textSubstringFrom(sub, arrStart));
    var games : [PropTypes.PlayerRecentGame] = [];
    for (block in gameBlocks.vals()) {
      let pts = parseFloatField(block, "\"pts\":");
      let fga = parseFloatField(block, "\"fga\":");
      let fta = parseFloatField(block, "\"fta\":");
      let minStr = GamesLib.extractQuotedAfterKey(block, "\"min\":");
      let minutes = if (minStr != "") parseMinutes(minStr) else 32.0;
      let date = GamesLib.extractQuotedAfterKey(block, "\"date\":");
      let opp = GamesLib.extractQuotedAfterKey(block, "\"abbreviation\":");
      let usageEst = if (fga > 0.0) {
        let rawUsage = (fga + 0.44 * fta) / 45.0;
        if (rawUsage > 0.45) 0.45 else rawUsage;
      } else 0.18;
      if (pts > 0.0 or fga > 0.0) {
        games := games.concat([{
          opponent = opp;
          points = pts;
          minutes;
          usageRate = usageEst;
          fieldGoalAttempts = fga;
          date;
        }]);
      };
    };
    // Return last 5 games for sparkline data
    let total = games.size();
    if (total <= 5) games
    else Array.tabulate<PropTypes.PlayerRecentGame>(5, func(i) { games[total - 5 + i] });
  };

  // Build OpenAI prompt for player props confidence scoring.
  public func buildPropsAnalysisPrompt(
    players : [PropTypes.PlayerProp],
    gameId : CommonTypes.GameId,
    historyCtx : Text,
  ) : Text {
    var prompt = "You are CourtEdge AI, an NBA betting analyst. Your job is to find high-confidence spots, not pick every game. Analyze player props for game " # gameId # " and return a JSON array where each element has \"playerId\", \"confidence\" (0-100 integer), and \"reasoning\" (50-100 words) fields. Only flag confidence ≥65 as actionable.\n\n";
    if (historyCtx != "") {
      prompt #= "Your past recommendation track record (learn from this):\n" # historyCtx # "\n";
    };
    prompt #= "Players:\n";
    for (p in players.vals()) {
      let recentPts = if (p.recentGames.size() > 0) {
        var sum = 0.0;
        for (g in p.recentGames.vals()) { sum += g.points };
        sum / floatOfNat(p.recentGames.size());
      } else p.seasonAvgPoints;
      prompt #= "- " # p.player.name # " (" # p.player.team # ", " # p.player.position # "): season avg " #
        (p.seasonAvgPoints).toText() # " pts, " #
        (p.seasonAvgMinutes).toText() # " min, recent 5-game avg " # recentPts.toText() #
        " pts, usage ~" # (p.seasonUsageRate * 100.0).toText() # "%, back-to-back: " #
        (if (p.backToBack) "yes" else "no") # ", injury: " # p.player.injuryStatus # "\n";
      switch (p.matchupDefRating) {
        case (?dr) { prompt #= "  Opponent def rating: " # (dr).toText() # "\n" };
        case null {};
      };
      if (p.propLines.size() > 0) {
        prompt #= "  Prop line: " # (p.propLines[0].line).toText() # " pts at " # p.propLines[0].bookmaker # "\n";
      };
    };
    prompt #= "\nReturn ONLY a JSON array. Example: [{\"playerId\":\"123\",\"confidence\":72,\"reasoning\":\"...\"}]";
    prompt;
  };

  // Apply AI confidence JSON to player props, or generate rule-based reasoning if no AI.
  public func applyConfidence(
    players : [PropTypes.PlayerProp],
    aiJson : Text,
    useAi : Bool,
  ) : [PropTypes.PlayerProp] {
    players.map<PropTypes.PlayerProp, PropTypes.PlayerProp>(func(p) {
      let conf = if (useAi) extractConfidenceForPlayer(p.player.id, aiJson)
                 else ruleBasedConfidence(p);
      let grade = scoreToGrade(conf);
      let projPts = if (p.recentGames.size() >= 3) {
        var sum = 0.0;
        for (g in p.recentGames.vals()) { sum += g.points };
        sum / floatOfNat(p.recentGames.size());
      } else p.seasonAvgPoints;
      let reasoning = if (useAi) extractReasoningForPlayer(p.player.name, aiJson)
                      else buildRuleReasoning(p, projPts, conf);
      {
        p with
        confidenceReport = ?{
          score = conf;
          grade;
          reasoning;
          keyFactors = buildKeyFactors(p);
          recommendation = if (conf >= 65) "LEAN OVER" else if (conf <= 35) "LEAN UNDER" else "PASS";
          projectedPoints = ?projPts;
        };
      };
    });
  };

  // ── Internal helpers ────────────────────────────────────────────

  // Rule-based confidence when no AI key configured.
  // usageRate is a decimal (0.0–1.0), e.g. 0.28 = 28%
  func ruleBasedConfidence(p : PropTypes.PlayerProp) : Nat {
    var score = 50;
    if (p.backToBack) { score -= 10 };
    if (p.player.injuryStatus != "Active" and p.player.injuryStatus != "") { score -= 15 };
    if (p.seasonUsageRate > 0.28) { score += 8 };
    switch (p.matchupDefRating) {
      case (?dr) {
        if (dr > 112.0) { score += 10 }
        else if (dr < 106.0) { score -= 8 };
      };
      case null {};
    };
    if (p.recentGames.size() >= 3) {
      var recentSum = 0.0;
      for (g in p.recentGames.vals()) { recentSum += g.points };
      let recentAvg = recentSum / floatOfNat(p.recentGames.size());
      if (recentAvg > p.seasonAvgPoints * 1.05) { score += 8 }
      else if (recentAvg < p.seasonAvgPoints * 0.92) { score -= 8 };
    };
    if (score < 0) 0 else if (score > 100) 100 else score.toNat();
  };

  func buildRuleReasoning(p : PropTypes.PlayerProp, projPts : Float, conf : Nat) : Text {
    var r = p.player.name # " projects " # projPts.toText() # " pts (season avg " # p.seasonAvgPoints.toText() # ").";
    if (p.backToBack) { r #= " Back-to-back fatigue is a concern." };
    switch (p.matchupDefRating) {
      case (?dr) {
        if (dr > 112.0) { r #= " Favorable matchup: opponent DRtg " # dr.toText() # "." }
        else if (dr < 106.0) { r #= " Tough matchup: opponent DRtg " # dr.toText() # "." };
      };
      case null {};
    };
    r #= if (conf >= 65) " Lean OVER." else if (conf <= 35) " Lean UNDER." else " No clear edge — PASS.";
    r;
  };

  func extractConfidenceForPlayer(playerId : CommonTypes.PlayerId, json : Text) : Nat {
    switch (GamesLib.textIndexOf(json, playerId)) {
      case null 50;
      case (?pos) {
        let sub = textSubstringFrom(json, pos);
        let confPos = switch (GamesLib.textIndexOf(sub, "\"confidence\":")) {
          case null return 50;
          case (?p) p + 14;
        };
        let raw = extractRawToken(textSubstringFrom(sub, confPos));
        switch (Nat.fromText(raw)) { case (?n) if (n <= 100) n else 50; case null 50 };
      };
    };
  };

  func extractReasoningForPlayer(playerName : Text, json : Text) : Text {
    switch (GamesLib.textIndexOf(json, playerName)) {
      case null "Insufficient data for detailed analysis.";
      case (?pos) {
        let sub = textSubstringFrom(json, pos);
        let r = GamesLib.extractQuotedAfterKey(sub, "\"reasoning\":");
        if (r == "") "Statistical model analysis based on available data." else r;
      };
    };
  };

  func scoreToGrade(score : Nat) : Text {
    if (score >= 80) "A"
    else if (score >= 65) "B"
    else if (score >= 50) "C"
    else if (score >= 35) "D"
    else "F";
  };

  func buildKeyFactors(p : PropTypes.PlayerProp) : [Text] {
    var factors : [Text] = [];
    if (p.backToBack) {
      factors := factors.concat(["Back-to-back game — fatigue factor"]);
    };
    switch (p.matchupDefRating) {
      case (?dr) {
        if (dr > 112.0) factors := factors.concat(["Weak opponent defense (" # dr.toText() # " DRtg)"])
        else if (dr < 106.0) factors := factors.concat(["Strong opponent defense (" # dr.toText() # " DRtg)"]);
      };
      case null {};
    };
    if (p.seasonUsageRate > 0.28) {
      factors := factors.concat(["High usage rate ~" # (p.seasonUsageRate * 100.0).toText() # "%"]);
    };
    if (p.player.injuryStatus != "Active" and p.player.injuryStatus != "") {
      factors := factors.concat(["Injury status: " # p.player.injuryStatus]);
    };
    if (p.recentGames.size() >= 3) {
      var sum = 0.0;
      for (g in p.recentGames.vals()) { sum += g.points };
      let avg = sum / floatOfNat(p.recentGames.size());
      if (avg > p.seasonAvgPoints * 1.05) {
        factors := factors.concat(["Hot streak: recent avg " # avg.toText() # " > season " # p.seasonAvgPoints.toText()]);
      } else if (avg < p.seasonAvgPoints * 0.92) {
        factors := factors.concat(["Cold stretch: recent avg " # avg.toText() # " < season " # p.seasonAvgPoints.toText()]);
      };
    };
    if (factors.size() == 0) {
      factors := ["Consistent scorer", "Healthy and active"];
    };
    factors;
  };

  func parseFloatField(json : Text, key : Text) : Float {
    let raw = extractRawToken(textSubstringFrom(json, switch (GamesLib.textIndexOf(json, key)) { case null 0; case (?p) p + key.size() }));
    switch (GamesLib.parseFloatText(raw)) { case (?f) f; case null 0.0 };
  };

  // Extract the first raw integer after the key "\"id\":" in an object string
  func extractRawIntFromObj(obj : Text) : Text {
    switch (GamesLib.textIndexOf(obj, "\"id\":")) {
      case null "";
      case (?pos) {
        let sub = textSubstringFrom(obj, pos + 5);
        extractRawToken(sub);
      };
    };
  };

  func extractRawToken(s : Text) : Text {
    let chars = s.toArray();
    var i = 0;
    while (i < chars.size() and (chars[i].toNat32() == 32 or chars[i].toNat32() == 9)) { i += 1 };
    var result = "";
    while (i < chars.size() and chars[i].toNat32() != 44 and chars[i].toNat32() != 125 and chars[i].toNat32() != 93 and chars[i].toNat32() != 32 and chars[i].toNat32() != 10) {
      result #= (chars[i]).toText();
      i += 1;
    };
    result;
  };

  func textSubstringFrom(s : Text, from : Nat) : Text {
    if (from >= s.size()) return "";
    let chars = s.toArray();
    var result = "";
    var i = from;
    while (i < chars.size()) {
      result #= (chars[i]).toText();
      i += 1;
    };
    result;
  };

  public func floatOfNat(n : Nat) : Float {
    var acc = 0.0;
    var i = 0;
    while (i < n) { acc += 1.0; i += 1 };
    acc;
  };
}
