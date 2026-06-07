import CommonTypes "../types/common";
import TotalTypes "../types/totals";
import Float "mo:core/Float";
import Array "mo:core/Array";
import GamesLib "../lib/games";

module {
  // Ball Don't Lie API — season averages for a team (2025 = 2024-25 season)
  public func buildBdlTeamStatsUrl(teamName : Text) : Text {
    "https://api.balldontlie.io/v1/season_averages?season=2025&team_ids[]=" # teamName;
  };

  // Ball Don't Lie API — recent game scores for a team by numeric team ID
  public func buildBdlTeamRecentGamesUrl(teamId : Text) : Text {
    "https://api.balldontlie.io/v1/games?seasons[]=2025&team_ids[]=" # teamId # "&per_page=10";
  };

  // ESPN summary for referee/venue info (enrichment only)
  public func buildEspnSummaryUrl(gameId : CommonTypes.GameId) : Text {
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=" # gameId;
  };

  // Parse BDL games JSON for a team into scoring trend data.
  // Shape: {"data":[{"home_team":{"abbreviation":"OKC"},"visitor_team":{...},"home_team_score":112,"visitor_team_score":98,"date":"..."}]}
  public func parseBdlTeamScores(
    json : Text,
    teamAbbr : Text,
  ) : (TotalTypes.PaceProfile, [TotalTypes.ScoringTrend]) {
    if (not GamesLib.textContains(json, "\"data\":")) {
      return (defaultPaceProfile(teamAbbr), []);
    };
    let dataStart = switch (GamesLib.textIndexOf(json, "\"data\":")) {
      case null return (defaultPaceProfile(teamAbbr), []);
      case (?pos) pos;
    };
    let sub = textSubstringFrom(json, dataStart);
    let arrStart = switch (GamesLib.textIndexOf(sub, "[")) {
      case null return (defaultPaceProfile(teamAbbr), []);
      case (?p) p;
    };
    let gameBlocks = GamesLib.splitTopLevelArrayElements(textSubstringFrom(sub, arrStart));
    var teamScores : [Float] = [];
    var oppScores : [Float] = [];
    var trends : [TotalTypes.ScoringTrend] = [];
    for (block in gameBlocks.vals()) {
      let homeAbbr = GamesLib.extractQuotedAfterKey(block, "\"home_team\":{\"abbreviation\":");
      let homeAbbr2 = GamesLib.extractQuotedAfterKey(block, "\"home_team\":{\"id\":");
      ignore homeAbbr2;
      let homeScore = parseFloatField(block, "\"home_team_score\":");
      let visitorScore = parseFloatField(block, "\"visitor_team_score\":");
      let date = GamesLib.extractQuotedAfterKey(block, "\"date\":");
      let visitorAbbr = GamesLib.extractQuotedAfterKey(block, "\"visitor_team\":{\"abbreviation\":");
      let isHome = GamesLib.textContains(homeAbbr, teamAbbr) or GamesLib.textContains(homeAbbr.toLower(), teamAbbr.toLower());
      let teamScore = if (isHome) homeScore else visitorScore;
      let oppScore = if (isHome) visitorScore else homeScore;
      let oppTeam = if (isHome) visitorAbbr else homeAbbr;
      if (teamScore > 0.0) {
        teamScores := teamScores.concat([teamScore]);
        oppScores := oppScores.concat([oppScore]);
        let gameTotal = teamScore + oppScore;
        // Use "W" / "L" result for display since we don't have the actual O/U line per game
        let result = if (teamScore > oppScore) "W" else "L";
        trends := trends.concat([{
          date;
          teamTotal = teamScore;
          gameTotal;
          opponent = oppTeam;
          overUnder = gameTotal;
          result;
        }]);
      };
    };
    let n = teamScores.size();
    if (n == 0) return (defaultPaceProfile(teamAbbr), []);
    var sumPts = 0.0;
    var sumOpp = 0.0;
    for (s in teamScores.vals()) { sumPts += s };
    for (s in oppScores.vals()) { sumOpp += s };
    let nf = floatOfNat(n);
    let avgPts = sumPts / nf;
    let avgOpp = sumOpp / nf;
    // Pace estimate: ~100 possessions for a 220-total game
    let pace = (avgPts + avgOpp) / 2.2;
    let last5Start = if (n > 5) n - 5 else 0;
    var last5Sum = 0.0;
    var i5 = last5Start;
    while (i5 < n) { last5Sum += teamScores[i5]; i5 += 1 };
    let last5Avg = last5Sum / floatOfNat(n - last5Start);
    let profile : TotalTypes.PaceProfile = {
      teamId = teamAbbr;
      pace;
      offensiveEfficiency = avgPts / pace * 100.0;
      defensiveEfficiency = avgOpp / pace * 100.0;
      avgPointsFor = avgPts;
      avgPointsAgainst = avgOpp;
      last5Avg;
    };
    // Return last 5 trends
    let tLen = trends.size();
    let last5Trends = if (tLen <= 5) trends
    else Array.tabulate(5, func(i) { trends[tLen - 5 + i] });
    (profile, last5Trends);
  };

  // Project combined game total: simple average of both teams' scoring rates.
  public func projectGameTotal(
    home : TotalTypes.PaceProfile,
    away : TotalTypes.PaceProfile,
  ) : Float {
    let avgPace = (home.pace + away.pace) / 2.0;
    let homeProjected = home.offensiveEfficiency * (avgPace / 100.0);
    let awayProjected = away.offensiveEfficiency * (avgPace / 100.0);
    let rawTotal = homeProjected + awayProjected;
    // Defensive adjustment
    let defAdj = (home.defensiveEfficiency + away.defensiveEfficiency) / 2.0;
    let adjustedTotal = rawTotal * (1.0 - ((defAdj - 100.0) / 200.0));
    if (adjustedTotal > 265.0) 265.0
    else if (adjustedTotal < 185.0) 185.0
    else adjustedTotal;
  };

  // Build OpenAI prompt for totals confidence scoring.
  public func buildTotalsAnalysisPrompt(total : TotalTypes.GameTotal) : Text {
    var prompt = "You are an NBA betting analyst specializing in game totals. Analyze the following data and return a JSON object with \"confidence\" (0-100 integer), \"reasoning\" (50-100 words), \"recommendation\" (\"OVER\", \"UNDER\", or \"PASS\"), and \"projectedTotal\" (float) fields.\n\n";
    prompt #= "Game ID: " # total.gameId # "\n";
    prompt #= "Home pace: " # total.homePace.pace.toText() # " possessions/game\n";
    prompt #= "Home avg pts: " # total.homePace.avgPointsFor.toText() # " scored, " # total.homePace.avgPointsAgainst.toText() # " allowed\n";
    prompt #= "Away pace: " # total.awayPace.pace.toText() # " possessions/game\n";
    prompt #= "Away avg pts: " # total.awayPace.avgPointsFor.toText() # " scored, " # total.awayPace.avgPointsAgainst.toText() # " allowed\n";
    switch (total.projectedTotal) {
      case (?pt) { prompt #= "Statistical projection: " # pt.toText() # " total points\n" };
      case null {};
    };
    prompt #= "Injury context: " # total.injuryImpact # "\n";
    if (total.recentTrends.size() > 0) {
      prompt #= "Recent totals (last 5): ";
      for (t in total.recentTrends.vals()) {
        prompt #= t.gameTotal.toText() # " (" # t.result # ") ";
      };
      prompt #= "\n";
    };
    prompt #= "\nReturn ONLY JSON. Example: {\"confidence\":68,\"reasoning\":\"...\",\"recommendation\":\"OVER\",\"projectedTotal\":228.5}";
    prompt;
  };

  // Apply AI confidence JSON to a GameTotal, or use rule-based reasoning.
  public func applyTotalsConfidence(
    total : TotalTypes.GameTotal,
    aiJson : Text,
    useAi : Bool,
  ) : TotalTypes.GameTotal {
    let confidence = if (useAi) extractIntField(aiJson, "confidence", ruleBasedTotalsConfidence(total))
                    else ruleBasedTotalsConfidence(total);
    let reasoning = if (useAi) extractTextField(aiJson, "reasoning", buildRuleReasoning(total, confidence))
                    else buildRuleReasoning(total, confidence);
    let rec = if (useAi) extractTextField(aiJson, "recommendation", ruleBasedRec(confidence))
              else ruleBasedRec(confidence);
    let projTotal = if (useAi) extractFloatField(aiJson, "projectedTotal", total.projectedTotal)
                    else total.projectedTotal;
    let grade = scoreToGrade(confidence);
    {
      total with
      projectedTotal = projTotal;
      confidenceReport = ?{
        score = confidence;
        grade;
        reasoning;
        keyFactors = buildTotalKeyFactors(total);
        recommendation = rec;
        projectedTotal = projTotal;
        overUnderEdge = if (confidence >= 65) "Edge on " # rec else "No clear edge";
      };
    };
  };

  // ── Internal helpers ────────────────────────────────────────────

  func defaultPaceProfile(teamId : CommonTypes.TeamId) : TotalTypes.PaceProfile {
    { teamId; pace = 98.0; offensiveEfficiency = 110.0; defensiveEfficiency = 110.0; avgPointsFor = 108.0; avgPointsAgainst = 108.0; last5Avg = 108.0 };
  };

  func ruleBasedTotalsConfidence(total : TotalTypes.GameTotal) : Nat {
    var score = 50;
    let paceAvg = (total.homePace.pace + total.awayPace.pace) / 2.0;
    if (paceAvg > 101.0) { score += 8 }
    else if (paceAvg < 96.0) { score -= 8 };
    // Recent trend consistency: if both teams score consistently
    if (total.recentTrends.size() >= 3) {
      var overCount = 0;
      for (t in total.recentTrends.vals()) {
        if (t.result == "OVER") { overCount += 1 };
      };
      if (overCount >= 4) { score += 10 }
      else if (overCount <= 1) { score -= 10 };
    };
    if (score < 0) 0 else if (score > 100) 100 else score.toNat();
  };

  func ruleBasedRec(confidence : Nat) : Text {
    if (confidence >= 65) "OVER"
    else if (confidence <= 35) "UNDER"
    else "PASS";
  };

  func buildRuleReasoning(total : TotalTypes.GameTotal, conf : Nat) : Text {
    var r = "Pace matchup: home " # total.homePace.pace.toText() # ", away " # total.awayPace.pace.toText() # " possessions/game. ";
    switch (total.projectedTotal) {
      case (?pt) { r #= "Model projects " # pt.toText() # " combined points. " };
      case null {};
    };
    r #= if (conf >= 65) "Lean OVER." else if (conf <= 35) "Lean UNDER." else "No strong directional edge.";
    r;
  };

  func buildTotalKeyFactors(total : TotalTypes.GameTotal) : [Text] {
    var factors : [Text] = [];
    let paceAvg = (total.homePace.pace + total.awayPace.pace) / 2.0;
    if (paceAvg > 100.0) {
      factors := factors.concat(["Fast-paced matchup (" # paceAvg.toText() # " avg pace)"]);
    } else if (paceAvg < 96.0) {
      factors := factors.concat(["Slow-paced matchup (" # paceAvg.toText() # " avg pace)"]);
    };
    if (total.injuryImpact != "" and total.injuryImpact != "No significant injuries reported") {
      factors := factors.concat(["Injury impact: " # total.injuryImpact]);
    };
    if (total.recentTrends.size() >= 3) {
      var overCount = 0;
      for (t in total.recentTrends.vals()) {
        if (t.result == "OVER") { overCount += 1 };
      };
      let total5 = total.recentTrends.size();
      if (overCount >= 4) { factors := factors.concat(["Strong over trend: " # overCount.toText() # "/" # total5.toText() # " recent games went OVER"]) }
      else if (overCount <= 1) { factors := factors.concat(["Strong under trend: only " # overCount.toText() # "/" # total5.toText() # " recent games went OVER"]) };
    };
    if (factors.size() == 0) {
      factors := ["Balanced pace matchup", "Both offenses near league average"];
    };
    factors;
  };

  func extractIntField(json : Text, field : Text, fallback : Nat) : Nat {
    let key = "\"" # field # "\":";
    switch (GamesLib.textIndexOf(json, key)) {
      case null fallback;
      case (?pos) {
        let sub = textSubstringFrom(json, pos + key.size());
        let raw = extractRawToken(sub);
        switch (Nat.fromText(raw)) { case (?n) if (n <= 100) n else fallback; case null fallback };
      };
    };
  };

  func extractTextField(json : Text, field : Text, fallback : Text) : Text {
    let r = GamesLib.extractQuotedAfterKey(json, "\"" # field # "\":");
    if (r == "") fallback else r;
  };

  func extractFloatField(json : Text, field : Text, fallback : ?Float) : ?Float {
    let key = "\"" # field # "\":";
    switch (GamesLib.textIndexOf(json, key)) {
      case null fallback;
      case (?pos) {
        let sub = textSubstringFrom(json, pos + key.size());
        let raw = extractRawToken(sub);
        switch (GamesLib.parseFloatText(raw)) { case (?f) ?f; case null fallback };
      };
    };
  };

  func parseFloatField(json : Text, key : Text) : Float {
    switch (GamesLib.textIndexOf(json, key)) {
      case null 0.0;
      case (?pos) {
        let sub = textSubstringFrom(json, pos + key.size());
        let raw = extractRawToken(sub);
        switch (GamesLib.parseFloatText(raw)) { case (?f) f; case null 0.0 };
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

  func scoreToGrade(score : Nat) : Text {
    if (score >= 80) "A"
    else if (score >= 65) "B"
    else if (score >= 50) "C"
    else if (score >= 35) "D"
    else "F";
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

  func floatOfNat(n : Nat) : Float {
    var acc = 0.0;
    var i = 0;
    while (i < n) { acc += 1.0; i += 1 };
    acc;
  };
}
