import CommonTypes "../types/common";
import GameTypes "../types/games";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import GamesLib "../lib/games";
import CacheLib "../lib/cache";

mixin (bdlApiKey : Text, oddsApiKey : Text, cache : CacheLib.Cache) {
  // IC transform callback — required for HTTP outcalls consensus normalization.
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Fetch today's NBA games.
  // PRIMARY source: Ball Don't Lie.
  // If today has no games, searches up to 14 days forward for the next slate.
  // Returns a GamesResponse with gamesDate and isUpcomingDate fields.
  public func getTodaysGames() : async CommonTypes.Result<GameTypes.GamesResponse> {
    let bdlHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    let todayStr = GamesLib.computeTodayDateStr();

    // Helper: fetch and parse BDL games for a given date string.
    let fetchGamesForDate = func(dateStr : Text) : async ?[GameTypes.Game] {
      let cacheKey = "bdl-games-" # dateStr;
      let url = GamesLib.buildBdlGamesUrlAll(dateStr);
      let json = switch (CacheLib.get(cache, cacheKey)) {
        case (?cached) cached;
        case null {
          let fetched = try {
            await OutCall.httpGetRequest(url, bdlHeaders, transform);
          } catch (_) { return null };
          if (fetched != "") { CacheLib.put(cache, cacheKey, fetched) };
          fetched;
        };
      };
      if (json == "") return null;
      if (GamesLib.textContains(json, "Unauthorized") or GamesLib.textContains(json, "\"401\"") or GamesLib.textContains(json, "Forbidden") or GamesLib.textContains(json, "\"403\"")) {
        return null; // auth error handled at top level
      };
      if (not GamesLib.textContains(json, "\"data\"")) return null;
      let games = GamesLib.parseBdlGames(json);
      if (games.size() > 0) ?games else null;
    };

    // First try today.
    let todayGames = try {
      await fetchGamesForDate(todayStr);
    } catch (_) { null };

    switch (todayGames) {
      case (?games) {
        let enriched = await overlayOdds(games);
        return #ok({ games = enriched; gamesDate = todayStr; isUpcomingDate = false });
      };
      case null {
        // Verify it's not an auth error by doing a direct check.
        let probeUrl = GamesLib.buildBdlGamesUrlAll(todayStr);
        let probeCacheKey = "bdl-games-" # todayStr;
        let probeJson = switch (CacheLib.get(cache, probeCacheKey)) {
          case (?cached) cached;
          case null {
            let fetched = try {
              await OutCall.httpGetRequest(probeUrl, bdlHeaders, transform);
            } catch (e) {
              return #err(#networkError("BDL HTTP call failed: " # e.message()));
            };
            if (fetched != "") { CacheLib.put(cache, probeCacheKey, fetched) };
            fetched;
          };
        };
        if (probeJson == "") {
          return #err(#networkError("BDL returned empty body for " # todayStr));
        };
        if (GamesLib.textContains(probeJson, "Unauthorized") or GamesLib.textContains(probeJson, "\"401\"") or GamesLib.textContains(probeJson, "Forbidden") or GamesLib.textContains(probeJson, "\"403\"")) {
          return #err(#parseError("BDL API key invalid or unauthorized"));
        };
        // No games today — search ahead up to 14 days using multi-date batch.
        // BDL supports ?dates[]=YYYY-MM-DD&dates[]=YYYY-MM-DD... so we batch 7 days at a time.
        let upcomingResult = await searchUpcomingGames(bdlHeaders, todayStr);
        switch (upcomingResult) {
          case (?resp) #ok(resp);
          case null {
            let preview = if (probeJson.size() > 300) GamesLib.textSubstring(probeJson, 0, 300) # "..." else probeJson;
            #err(#networkError("No NBA games found for " # todayStr # ". BDL raw: " # preview));
          };
        };
      };
    };
  };

  // Search for the next upcoming games by batching future dates.
  // Tries days 1-7, then 8-14. Returns the first batch that has games.
  func searchUpcomingGames(bdlHeaders : [{ name : Text; value : Text }], fromDateStr : Text) : async ?GameTypes.GamesResponse {
    // Build a multi-date URL spanning 7 consecutive days starting at offset.
    let buildBatchUrl = func(offsets : [Nat]) : Text {
      var url = "https://api.balldontlie.io/v1/games?postseason=true&per_page=100";
      for (off in offsets.vals()) {
        let futureDate = GamesLib.advanceDateStr(fromDateStr, off);
        url #= "&dates[]=" # futureDate;
      };
      url;
    };

    // Batch 1: days +1 through +7
    let batch1Url = buildBatchUrl([1, 2, 3, 4, 5, 6, 7]);
    let batch1Json = try {
      await OutCall.httpGetRequest(batch1Url, bdlHeaders, transform);
    } catch (_) { "" };
    if (batch1Json != "" and GamesLib.textContains(batch1Json, "\"data\"")) {
      let batch1Games = GamesLib.parseBdlGames(batch1Json);
      if (batch1Games.size() > 0) {
        // Find the earliest game date in the batch
        let earliestDate = GamesLib.earliestGameDate(batch1Games, fromDateStr);
        // Filter to just that date's games
        let dayGames = GamesLib.filterGamesByDate(batch1Games, earliestDate);
        let enriched = await overlayOdds(dayGames);
        return ?({
          games = enriched;
          gamesDate = earliestDate;
          isUpcomingDate = true;
        });
      };
    };

    // Batch 2: days +8 through +14
    let batch2Url = buildBatchUrl([8, 9, 10, 11, 12, 13, 14]);
    let batch2Json = try {
      await OutCall.httpGetRequest(batch2Url, bdlHeaders, transform);
    } catch (_) { "" };
    if (batch2Json != "" and GamesLib.textContains(batch2Json, "\"data\"")) {
      let batch2Games = GamesLib.parseBdlGames(batch2Json);
      if (batch2Games.size() > 0) {
        let earliestDate = GamesLib.earliestGameDate(batch2Games, fromDateStr);
        let dayGames = GamesLib.filterGamesByDate(batch2Games, earliestDate);
        let enriched = await overlayOdds(dayGames);
        return ?({
          games = enriched;
          gamesDate = earliestDate;
          isUpcomingDate = true;
        });
      };
    };

    null;
  };

  // Overlay Odds API odds onto BDL games. Best-effort — returns games unchanged on any failure.
  func overlayOdds(games : [GameTypes.Game]) : async [GameTypes.Game] {
    let oddsUrl = GamesLib.buildOddsApiUrl(oddsApiKey);
    let oddsCacheKey = "odds-nba-" # GamesLib.computeTodayDateStr();
    let oddsJson = switch (CacheLib.get(cache, oddsCacheKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(oddsUrl, [], transform);
        } catch (_e) { return games };
        if (fetched != "") { CacheLib.put(cache, oddsCacheKey, fetched) };
        fetched;
      };
    };
    if (oddsJson == "") return games;
    if (oddsJson == "" or not GamesLib.textContains(oddsJson, "home_team")) return games;
    let oddsBlocks = GamesLib.splitTopLevelArrayElements(oddsJson);
    var enriched : [GameTypes.Game] = [];
    for (game in games.vals()) {
      var matched : ?Text = null;
      let homeCity = game.homeTeam.city;
      let homeAbbr = game.homeTeam.abbreviation;
      let homeName = game.homeTeam.name;
      for (block in oddsBlocks.vals()) {
        if (matched == null) {
          if (
            GamesLib.textContains(block, homeCity) or
            GamesLib.textContains(block, homeAbbr) or
            GamesLib.textContains(block, homeName)
          ) {
            matched := ?block;
          };
        };
      };
      let gameOdds = switch (matched) {
        case null [];
        case (?b) GamesLib.extractOddsFromGame(b);
      };
      enriched := enriched.concat([{ game with odds = gameOdds }]);
    };
    enriched;
  };

  // Fetch full investigation for a game.
  // gameDate: YYYY-MM-DD string for the game's scheduled date (may be future for upcoming games).
  public func getGameInvestigation(gameId : CommonTypes.GameId, gameDate : Text) : async CommonTypes.Result<GameTypes.GameInvestigation> {
    let bdlHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    // Use provided gameDate so upcoming games (isUpcomingDate=true) are found correctly.
    let dateStr = if (gameDate == "") GamesLib.computeTodayDateStr() else gameDate;
    let bdlUrl = GamesLib.buildBdlGamesUrlAll(dateStr);
    let bdlCacheKey = "bdl-game-inv-" # dateStr;
    let bdlJson = switch (CacheLib.get(cache, bdlCacheKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(bdlUrl, bdlHeaders, transform);
        } catch (e) {
          return #err(#networkError("BDL call failed in getGameInvestigation: " # e.message()));
        };
        if (fetched != "") { CacheLib.put(cache, bdlCacheKey, fetched) };
        fetched;
      };
    };
    if (GamesLib.textContains(bdlJson, "Unauthorized") or GamesLib.textContains(bdlJson, "\"401\"")) {
      return #err(#parseError("BDL API key invalid or unauthorized"));
    };
    if (not GamesLib.textContains(bdlJson, "\"data\"")) {
      return #err(#parseError("BDL API error: unexpected response. Raw: " # GamesLib.textSubstring(bdlJson, 0, 200)));
    };
    let allGames = GamesLib.parseBdlGames(bdlJson);
    var foundGame : ?GameTypes.Game = null;
    for (g in allGames.vals()) {
      if (g.id == gameId) { foundGame := ?g };
    };
    let game = switch (foundGame) {
      case null return #err(#notFound("Game " # gameId # " not found in today's BDL games (" # dateStr # ")"));
      case (?g) g;
    };
    let odds = try { await fetchOddsForTeam(game.homeTeam.name) } catch (_e) { [] };
    let discrepancies = GamesLib.detectDiscrepancies(odds);
    let emptyStats = func(tid : Text) : GameTypes.TeamStats {
      { teamId = tid; offensiveRating = null; defensiveRating = null; pace = null; pointsPerGame = null; recentForm = []; homeAwayRecord = ""; restDays = 1 };
    };
    #ok({
      game;
      homeTeamStats = emptyStats(game.homeTeam.id);
      awayTeamStats = emptyStats(game.awayTeam.id);
      injuries = [];
      odds;
      discrepancies;
    });
  };

  func fetchOddsForTeam(homeTeamName : Text) : async [GameTypes.OddsLine] {
    let url = GamesLib.buildOddsApiUrl(oddsApiKey);
    let oddsCacheKey = "odds-nba-" # GamesLib.computeTodayDateStr();
    let json = switch (CacheLib.get(cache, oddsCacheKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(url, [], transform);
        } catch (_e) { return [] };
        if (fetched != "") { CacheLib.put(cache, oddsCacheKey, fetched) };
        fetched;
      };
    };
    if (json == "") return [];
    if (json == "") return [];
    let gameBlocks = GamesLib.splitTopLevelArrayElements(json);
    var foundBlock : ?Text = null;
    for (block in gameBlocks.vals()) {
      if (GamesLib.textContains(block, homeTeamName)) { foundBlock := ?block };
    };
    switch (foundBlock) {
      case null [];
      case (?b) GamesLib.extractOddsFromGame(b);
    };
  };

  // Fetch multi-book odds for a specific game (Odds API).
  public func getMultiBookOdds(gameId : CommonTypes.GameId) : async CommonTypes.Result<[GameTypes.OddsLine]> {
    try {
      let url = GamesLib.buildOddsApiUrl(oddsApiKey);
      let oddsCacheKey = "odds-nba-" # GamesLib.computeTodayDateStr();
      let json = switch (CacheLib.get(cache, oddsCacheKey)) {
        case (?cached) cached;
        case null {
          let fetched = await OutCall.httpGetRequest(url, [], transform);
          if (fetched != "") { CacheLib.put(cache, oddsCacheKey, fetched) };
          fetched;
        };
      };
      if (json == "") return #err(#networkError("Odds API returned empty body"));
      let gameBlocks = GamesLib.splitTopLevelArrayElements(json);
      var foundBlock : ?Text = null;
      for (block in gameBlocks.vals()) {
        if (GamesLib.textContains(block, gameId)) { foundBlock := ?block };
      };
      switch (foundBlock) {
        case null #err(#notFound("Game " # gameId # " not found in Odds API data"));
        case (?b) #ok(GamesLib.extractOddsFromGame(b));
      };
    } catch (e) {
      #err(#networkError("Odds API call failed: " # e.message()));
    };
  };
};
