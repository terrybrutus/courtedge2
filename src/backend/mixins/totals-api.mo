import CommonTypes "../types/common";
import TotalTypes "../types/totals";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import TotalsLib "../lib/totals";
import GamesLib "../lib/games";
import CacheLib "../lib/cache";
import Text "mo:core/Text";
import Nat "mo:core/Nat";

mixin (bdlApiKey : Text, openAIApiKey : Text, httpTransform : shared query OutCall.TransformationInput -> async OutCall.TransformationOutput, cache : CacheLib.Cache) {
  // Fetch game totals analysis using Ball Don't Lie for real team scoring data.
  public func getGameTotalsAnalysis(gameId : CommonTypes.GameId, homeTeamName : Text, awayTeamName : Text) : async CommonTypes.Result<TotalTypes.GameTotal> {
    let bdlAuthHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    func teamNameToBdlId(name : Text) : ?Nat {
      if (name.contains(#text "Hawks")) ?1
      else if (name.contains(#text "Celtics")) ?2
      else if (name.contains(#text "Nets")) ?3
      else if (name.contains(#text "Hornets")) ?4
      else if (name.contains(#text "Bulls")) ?5
      else if (name.contains(#text "Cavaliers")) ?6
      else if (name.contains(#text "Mavericks")) ?7
      else if (name.contains(#text "Nuggets")) ?8
      else if (name.contains(#text "Pistons")) ?9
      else if (name.contains(#text "Warriors")) ?10
      else if (name.contains(#text "Rockets")) ?11
      else if (name.contains(#text "Pacers")) ?12
      else if (name.contains(#text "Clippers")) ?13
      else if (name.contains(#text "Lakers")) ?14
      else if (name.contains(#text "Grizzlies")) ?15
      else if (name.contains(#text "Heat")) ?16
      else if (name.contains(#text "Bucks")) ?17
      else if (name.contains(#text "Timberwolves")) ?18
      else if (name.contains(#text "Pelicans")) ?19
      else if (name.contains(#text "Knicks")) ?20
      else if (name.contains(#text "Thunder")) ?21
      else if (name.contains(#text "Magic")) ?22
      else if (name.contains(#text "76ers")) ?23
      else if (name.contains(#text "Suns")) ?24
      else if (name.contains(#text "Trail Blazers")) ?25
      else if (name.contains(#text "Kings")) ?26
      else if (name.contains(#text "Spurs")) ?27
      else if (name.contains(#text "Raptors")) ?28
      else if (name.contains(#text "Jazz")) ?29
      else if (name.contains(#text "Wizards")) ?30
      else null
    };

    let homeId = switch (teamNameToBdlId(homeTeamName)) {
      case null return #err(#notFound("Could not resolve team: " # homeTeamName));
      case (?id) id;
    };
    let awayId = switch (teamNameToBdlId(awayTeamName)) {
      case null return #err(#notFound("Could not resolve team: " # awayTeamName));
      case (?id) id;
    };

    try {
      // Injury context from ESPN — cached per game ID
      let espnUrl = TotalsLib.buildEspnSummaryUrl(gameId);
      let espnCacheKey = "espn-summary-" # gameId;
      let espnJson = switch (CacheLib.get(cache, espnCacheKey)) {
        case (?cached) cached;
        case null {
          let fetched = try {
            await OutCall.httpGetRequest(espnUrl, [], httpTransform);
          } catch (_) { "" };
          if (fetched != "") { CacheLib.put(cache, espnCacheKey, fetched) };
          fetched;
        };
      };
      let injuries = GamesLib.parseInjuriesFromEspn(espnJson);
      let injuryImpact = if (injuries.size() > 0) {
        var desc = "";
        var i = 0;
        while (i < injuries.size() and i < 3) {
          if (desc != "") { desc #= ", " };
          desc #= injuries[i].playerName # " (" # injuries[i].status # ")";
          i += 1;
        };
        desc;
      } else "No significant injuries reported";

      // Fetch real team scoring data from Ball Don't Lie using numeric team IDs.
      // The two calls are strictly sequential (homeJson fully awaited before awayJson)
      // to avoid BDL rate limiting. 429 responses are retried up to 3 times.
      let homeIdText = homeId.toText();
      let awayIdText = awayId.toText();

      let homeUrl = TotalsLib.buildBdlTeamRecentGamesUrl(homeIdText);
      let homeCacheKey = "bdl-team-recent-" # homeIdText;
      let homeJson = switch (CacheLib.get(cache, homeCacheKey)) {
        case (?cached) cached;
        case null {
          let fetched = await bdlGetWithRetryTotals(homeUrl, bdlAuthHeaders, 0);
          if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, homeCacheKey, fetched) };
          fetched;
        };
      };
      if (GamesLib.textContains(homeJson, "__BDL_AUTH_ERROR__")) {
        return #err(#parseError("BDL API key invalid or unauthorized. Please verify your key at app.balldontlie.io"));
      };
      let homeResult = TotalsLib.parseBdlTeamScores(homeJson, homeIdText);
      let homePace = homeResult.0;
      let homeTrends = homeResult.1;

      // Away call strictly after home call completes
      let awayUrl = TotalsLib.buildBdlTeamRecentGamesUrl(awayIdText);
      let awayCacheKey = "bdl-team-recent-" # awayIdText;
      let awayJson = switch (CacheLib.get(cache, awayCacheKey)) {
        case (?cached) cached;
        case null {
          let fetched = await bdlGetWithRetryTotals(awayUrl, bdlAuthHeaders, 0);
          if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, awayCacheKey, fetched) };
          fetched;
        };
      };
      let awayResult = TotalsLib.parseBdlTeamScores(awayJson, awayIdText);
      let awayPace = awayResult.0;
      let awayTrends = awayResult.1;

      // Combine trends from both teams
      let combinedTrends = homeTrends.concat(awayTrends);

      // Project total
      let projectedTotal = TotalsLib.projectGameTotal(homePace, awayPace);

      // Return totals data without calling OpenAI automatically.
      // AI analysis is triggered separately via getTotalsAIAnalysis().
      let initial : TotalTypes.GameTotal = {
        gameId;
        homePace;
        awayPace;
        impliedTotal = null;
        projectedTotal = ?projectedTotal;
        recentTrends = combinedTrends;
        refereeProfile = null;
        injuryImpact;
        confidenceReport = null;
      };
      #ok(initial);
    } catch (e) {
      #err(#networkError("Game totals analysis failed: " # e.message()));
    };
  };

  // On-demand AI analysis for game totals — only called when user clicks "Analyze with AI".
  public func getTotalsAIAnalysis(gameId : Text, totalsData : Text) : async Text {
    let historyCtx = "";
    let aiSystemPrompt = "You are CourtEdge AI, a professional NBA betting analyst. Focus on game totals (over/under). Be selective — only recommend when multiple signals align.";
    let sanitized = totalsData.replace(#text "\"", "'");
    let cleanHistory = historyCtx.replace(#text "\"", "'");
    let historyPart = if (cleanHistory != "") "Past totals track record:\\n" # cleanHistory # "\\n\\n" else "";
    let aiBody = "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"system\",\"content\":\"" # aiSystemPrompt # "\"},{\"role\":\"user\",\"content\":\"" # historyPart # "Analyze this game total for game " # gameId # ":\\n" # sanitized # "\\n\\nGive: confidence (0-100), OVER/UNDER/PASS recommendation, projected total, and plain-language reasoning explaining the key signals.\"}],\"max_tokens\":600,\"temperature\":0.3}";
    let aiHeaders = [
      { name = "Authorization"; value = "Bearer " # openAIApiKey },
      { name = "Content-Type"; value = "application/json" },
    ];
    try {
      let raw = await OutCall.httpPostRequest("https://api.openai.com/v1/chat/completions", aiHeaders, aiBody, httpTransform);
      // Extract assistant message content from OpenAI response JSON.
      extractOpenAIContentTotals(raw);
    } catch (e) {
      "AI analysis failed: " # e.message();
    };
  };

  private func extractOpenAIContentTotals(raw : Text) : Text {
    if (GamesLib.textContains(raw, "\"error\":{") or GamesLib.textContains(raw, "\"error\": {")) {
      let errMsg = GamesLib.extractQuotedAfterKey(raw, "\"message\":");
      return if (errMsg != "") "AI error: " # errMsg else "AI request failed — check your OpenAI key";
    };
    let marker = "\"content\":\"";
    var last = raw;
    for (segment in raw.split(#text marker)) {
      last := segment;
    };
    if (last == raw) return "No AI response found — try again";
    let chars = last.toArray();
    var result = "";
    var i = 0;
    while (i < chars.size()) {
      let cn = chars[i].toNat32();
      if (cn == 92 and i + 1 < chars.size()) {
        let next = chars[i + 1].toNat32();
        if (next == 110) { result #= "\n"; i += 2 }
        else if (next == 34) { result #= "\""; i += 2 }
        else if (next == 116) { result #= "\t"; i += 2 }
        else if (next == 92) { result #= "\\"; i += 2 }
        else { i += 1 };
      } else if (cn == 34) {
        i := chars.size();
      } else {
        result #= (chars[i]).toText();
        i += 1;
      };
    };
    if (result == "") "AI analysis complete" else result
  };

  func defaultPaceProfile(teamId : Text) : TotalTypes.PaceProfile {
    { teamId; pace = 98.0; offensiveEfficiency = 110.0; defensiveEfficiency = 110.0; avgPointsFor = 108.0; avgPointsAgainst = 108.0; last5Avg = 108.0 };
  };

  // Retry a BDL GET request up to 3 times on 429. Each retry awaits a no-op
  // async boundary (~200-500ms natural latency spacing) before attempting again.
  // Returns "__BDL_AUTH_ERROR__" on auth failure.
  func bdlGetWithRetryTotals(
    url : Text,
    headers : [OutCall.Header],
    attempt : Nat,
  ) : async Text {
    let maxAttempts = 3;
    let result = try {
      await OutCall.httpGetRequest(url, headers, httpTransform);
    } catch (_) { "" };

    if (
      GamesLib.textContains(result, "Unauthorized") or
      GamesLib.textContains(result, "\"401\"") or
      GamesLib.textContains(result, "Forbidden") or
      GamesLib.textContains(result, "\"403\"")
    ) {
      return "__BDL_AUTH_ERROR__";
    };

    if (
      attempt < maxAttempts and (
        GamesLib.textContains(result, "Too many requests") or
        GamesLib.textContains(result, "too many requests") or
        GamesLib.textContains(result, "\"429\"") or
        GamesLib.textContains(result, "Rate limit")
      )
    ) {
      return await bdlGetWithRetryTotals(url, headers, attempt + 1);
    };

    result;
  };
};
