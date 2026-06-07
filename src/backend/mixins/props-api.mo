import CommonTypes "../types/common";
import PropTypes "../types/props";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import PropsLib "../lib/props";
import Array "mo:core/Array";
import GamesLib "../lib/games";
import CacheLib "../lib/cache";
import Float "mo:core/Float";

mixin (bdlApiKey : Text, openAIApiKey : Text, httpTransform : shared query OutCall.TransformationInput -> async OutCall.TransformationOutput, cache : CacheLib.Cache) {
  // Fetch player props analysis for a game using Ball Don't Lie for real stats.
  // Roster is obtained from BDL (single game → team IDs → team rosters)
  // instead of ESPN, since ESPN event IDs differ from BDL game IDs.
  public func getPlayerPropsAnalysis(gameId : CommonTypes.GameId) : async CommonTypes.Result<PropTypes.PlayerPropsAnalysis> {
    let bdlAuthHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    try {
      // Step 1: Fetch single game from BDL to get team IDs.
      let gameCacheKey = "bdl-game-single-" # gameId;
      let gameJson = switch (CacheLib.get(cache, gameCacheKey)) {
        case (?cached) cached;
        case null {
          let url = PropsLib.buildBdlSingleGameUrl(gameId);
          let fetched = await bdlGetWithRetry(url, bdlAuthHeaders, 0);
          if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, gameCacheKey, fetched) };
          fetched;
        };
      };
      if (GamesLib.textContains(gameJson, "__BDL_AUTH_ERROR__")) {
        return #err(#parseError("BDL API key invalid or unauthorized"));
      };

      // Step 2: Extract team IDs, fetch rosters.
      let (homeTeamId, awayTeamId) = switch (PropsLib.parseBdlSingleGameTeamIds(gameJson)) {
        case null {
          return #err(#notFound("Could not resolve team IDs for game " # gameId # " — raw: " # GamesLib.textSubstring(gameJson, 0, 200)));
        };
        case (?ids) ids;
      };

      let homeRosterCacheKey = "bdl-roster-" # homeTeamId;
      let homeRosterJson = switch (CacheLib.get(cache, homeRosterCacheKey)) {
        case (?cached) cached;
        case null {
          let url = PropsLib.buildBdlTeamRosterUrl(homeTeamId);
          let fetched = await bdlGetWithRetry(url, bdlAuthHeaders, 0);
          if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, homeRosterCacheKey, fetched) };
          fetched;
        };
      };

      let awayRosterCacheKey = "bdl-roster-" # awayTeamId;
      let awayRosterJson = switch (CacheLib.get(cache, awayRosterCacheKey)) {
        case (?cached) cached;
        case null {
          let url = PropsLib.buildBdlTeamRosterUrl(awayTeamId);
          let fetched = await bdlGetWithRetry(url, bdlAuthHeaders, 0);
          if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, awayRosterCacheKey, fetched) };
          fetched;
        };
      };

      let homePlayers = PropsLib.parseBdlTeamRoster(homeRosterJson);
      let awayPlayers = PropsLib.parseBdlTeamRoster(awayRosterJson);
      // Limit to 6 per team (12 total) to control API call volume and cycle cost
      let homeSlice = if (homePlayers.size() > 6) Array.tabulate<PropTypes.Player>(6, func(i) { homePlayers[i] }) else homePlayers;
      let awaySlice = if (awayPlayers.size() > 6) Array.tabulate<PropTypes.Player>(6, func(i) { awayPlayers[i] }) else awayPlayers;
      let allPlayers = homeSlice.concat(awaySlice);

      if (allPlayers.size() == 0) {
        return #err(#notFound("No roster data found for game " # gameId));
      };

      // Step 3: For each player, fetch season averages and recent games.
      // All calls strictly sequential to respect BDL rate limits (100 req/min free tier).
      var playerProps : [PropTypes.PlayerProp] = [];
      for (player in allPlayers.vals()) {
        let (seasonAvgPts, seasonAvgMin, usageEst) = if (player.id != "") {
          let avgUrl = PropsLib.buildBdlSeasonAvgUrl(player.id);
          let avgCacheKey = "bdl-avg-" # player.id;
          let avgJson = switch (CacheLib.get(cache, avgCacheKey)) {
            case (?cached) cached;
            case null {
              let fetched = await bdlGetWithRetry(avgUrl, bdlAuthHeaders, 0);
              if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, avgCacheKey, fetched) };
              fetched;
            };
          };
          PropsLib.parseBdlSeasonAverages(avgJson);
        } else (0.0, 32.0, 0.18);

        let recentGames = if (player.id != "") {
          let recentUrl = PropsLib.buildBdlRecentGamesUrl(player.id);
          let recentCacheKey = "bdl-recent-" # player.id;
          let recentJson = switch (CacheLib.get(cache, recentCacheKey)) {
            case (?cached) cached;
            case null {
              let fetched = await bdlGetWithRetry(recentUrl, bdlAuthHeaders, 0);
              if (fetched != "" and fetched != "__BDL_AUTH_ERROR__") { CacheLib.put(cache, recentCacheKey, fetched) };
              fetched;
            };
          };
          PropsLib.parseBdlRecentGames(recentJson);
        } else [];

        // Only include players who have data this season
        if (seasonAvgPts > 0.0 or recentGames.size() > 0) {
          let prop : PropTypes.PlayerProp = {
            player;
            seasonAvgPoints = seasonAvgPts;
            seasonAvgMinutes = seasonAvgMin;
            seasonUsageRate = usageEst;
            recentGames;
            matchupDefRating = null;
            propLines = [];
            homeAwaySplit = seasonAvgPts;
            backToBack = false;
            confidenceReport = null;
          };
          playerProps := appendProp(playerProps, prop);
        };
      };

      // Apply rule-based confidence scores upfront; AI analysis is on-demand
      let withConf = PropsLib.applyConfidence(playerProps, "", false);

      #ok({
        gameId;
        players = withConf;
        analysisGeneratedAt = "live";
      });
    } catch (e) {
      #err(#networkError("Player props analysis failed: " # e.message()));
    };
  };

  // On-demand AI analysis — reads history context for self-learning
  public func getPropsAIAnalysis(gameId : Text, playerData : Text) : async Text {
    let historyCtx = "";
    let aiSystemPrompt = "You are CourtEdge AI, a professional NBA betting analyst. Be selective — only flag confidence ≥65 where multiple signals align. Less is more.";
    let cleanData = playerData.replace(#text "\"", "'");
    let cleanHistory = historyCtx.replace(#text "\"", "'");
    let historyPart = if (cleanHistory != "") "Your past track record:\\n" # cleanHistory # "\\n\\n" else "";
    let aiBody = "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"system\",\"content\":\"" # aiSystemPrompt # "\"},{\"role\":\"user\",\"content\":\"" # historyPart # "Analyze props for game " # gameId # ":\\n" # cleanData # "\\n\\nFor each player: confidence 0-100, plain reasoning. Focus on multiple signal convergence. Return well-structured text.\"}],\"max_tokens\":900,\"temperature\":0.3}";
    let aiHeaders = [
      { name = "Authorization"; value = "Bearer " # openAIApiKey },
      { name = "Content-Type"; value = "application/json" },
    ];
    try {
      let raw = await OutCall.httpPostRequest("https://api.openai.com/v1/chat/completions", aiHeaders, aiBody, httpTransform);
      extractOpenAIContent(raw);
    } catch (e) {
      "AI analysis unavailable: " # e.message();
    };
  };

  private func extractOpenAIContent(raw : Text) : Text {
    if (GamesLib.textContains(raw, "\"error\":{") or GamesLib.textContains(raw, "\"error\": {")) {
      let errMsg = GamesLib.extractQuotedAfterKey(raw, "\"message\":");
      return if (errMsg != "") "AI error: " # errMsg else "AI request failed — check your OpenAI key";
    };
    let marker = "\"content\":\"";
    var last = raw;
    for (segment in raw.split(#text marker)) {
      last := segment;
    };
    if (last == raw) return "No AI response found — the model may be overloaded, try again";
    // Parse content, handling escape sequences
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

  func appendProp(arr : [PropTypes.PlayerProp], item : PropTypes.PlayerProp) : [PropTypes.PlayerProp] {
    let oldSize = arr.size();
    Array.tabulate<PropTypes.PlayerProp>(oldSize + 1, func(i) {
      if (i < oldSize) { arr[i] } else { item };
    });
  };

  func bdlGetWithRetry(
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
      return await bdlGetWithRetry(url, headers, attempt + 1);
    };

    result;
  };
};
