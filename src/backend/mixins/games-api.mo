import CommonTypes "../types/common";
import GameTypes "../types/games";
import TotalTypes "../types/totals";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import GamesLib "../lib/games";
import RefsLib "../lib/refs";
import SituationsLib "../lib/situations";
import CacheLib "../lib/cache";
import Map "mo:core/Map";

mixin (bdlApiKey : Text, oddsApiKey : Text, cache : CacheLib.Cache) {
  // Persistent opening-line store — never expires, used for line movement tracking.
  let lineOpenStore : Map.Map<Text, Text> = Map.empty();

  // IC transform callback — required for HTTP outcalls consensus normalization.
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Fetch today's NBA games.
  public func getTodaysGames() : async CommonTypes.Result<GameTypes.GamesResponse> {
    let bdlHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    let todayStr = GamesLib.computeTodayDateStr();

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
        return null;
      };
      if (not GamesLib.textContains(json, "\"data\"")) return null;
      let games = GamesLib.parseBdlGames(json);
      if (games.size() > 0) ?games else null;
    };

    let todayGames = try {
      await fetchGamesForDate(todayStr);
    } catch (_) { null };

    switch (todayGames) {
      case (?games) {
        let enriched = await overlayOdds(games);
        return #ok({ games = enriched; gamesDate = todayStr; isUpcomingDate = false });
      };
      case null {
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

  func searchUpcomingGames(bdlHeaders : [{ name : Text; value : Text }], fromDateStr : Text) : async ?GameTypes.GamesResponse {
    let buildBatchUrl = func(offsets : [Nat]) : Text {
      var url = "https://api.balldontlie.io/v1/games?postseason=true&per_page=100";
      for (off in offsets.vals()) {
        let futureDate = GamesLib.advanceDateStr(fromDateStr, off);
        url #= "&dates[]=" # futureDate;
      };
      url;
    };

    let batch1Url = buildBatchUrl([1, 2, 3, 4, 5, 6, 7]);
    let batch1Json = try {
      await OutCall.httpGetRequest(batch1Url, bdlHeaders, transform);
    } catch (_) { "" };
    if (batch1Json != "" and GamesLib.textContains(batch1Json, "\"data\"")) {
      let batch1Games = GamesLib.parseBdlGames(batch1Json);
      if (batch1Games.size() > 0) {
        let earliestDate = GamesLib.earliestGameDate(batch1Games, fromDateStr);
        let dayGames = GamesLib.filterGamesByDate(batch1Games, earliestDate);
        let enriched = await overlayOdds(dayGames);
        return ?({ games = enriched; gamesDate = earliestDate; isUpcomingDate = true });
      };
    };

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
        return ?({ games = enriched; gamesDate = earliestDate; isUpcomingDate = true });
      };
    };

    null;
  };

  // Overlay Odds API odds onto BDL games and record opening lines for movement tracking.
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
    if (oddsJson == "" or not GamesLib.textContains(oddsJson, "home_team")) return games;
    let oddsBlocks = GamesLib.splitTopLevelArrayElements(oddsJson);
    var enriched : [GameTypes.Game] = [];
    for (game in games.vals()) {
      var matched : ?Text = null;
      for (block in oddsBlocks.vals()) {
        if (matched == null) {
          if (GamesLib.textContains(block, game.homeTeam.city) or
              GamesLib.textContains(block, game.homeTeam.abbreviation) or
              GamesLib.textContains(block, game.homeTeam.name)) {
            matched := ?block;
          };
        };
      };
      let gameOdds = switch (matched) {
        case null [];
        case (?b) {
          let lines = GamesLib.extractOddsFromGame(b);
          // Record opening line for this game if not yet stored
          recordOpeningLine(game.id, lines);
          lines;
        };
      };
      enriched := enriched.concat([{ game with odds = gameOdds }]);
    };
    enriched;
  };

  // Store the first line snapshot seen for a game (opening line).
  func recordOpeningLine(gameId : Text, odds : [GameTypes.OddsLine]) {
    switch (lineOpenStore.get(gameId)) {
      case (?_) {}; // already have opening — never overwrite
      case null {
        if (odds.size() > 0) {
          var spread = "0";
          var total = "0";
          var hml = "0";
          switch (odds[0].homeSpread) { case (?s) { spread := s.toText() }; case null {} };
          switch (odds[0].overUnder) { case (?t) { total := t.toText() }; case null {} };
          switch (odds[0].homeMoneyline) { case (?m) { hml := m.toText() }; case null {} };
          lineOpenStore.add(gameId, spread # "|" # total # "|" # hml);
        };
      };
    };
  };

  // Compute line movement from stored opening line vs current odds.
  func computeLineMovement(gameId : Text, currentOdds : [GameTypes.OddsLine]) : ?GameTypes.LineMovement {
    if (currentOdds.size() == 0) return null;
    let openingStr = switch (lineOpenStore.get(gameId)) {
      case null return null;
      case (?s) s;
    };
    // Parse "spread|total|hml"
    let parts = openingStr.split(#text "|");
    var partsArr : [Text] = [];
    for (p in parts) { partsArr := partsArr.concat([p]) };
    if (partsArr.size() < 2) return null;
    let openSpread = GamesLib.parseFloatText(partsArr[0]);
    let openTotal = GamesLib.parseFloatText(partsArr[1]);

    // Current consensus
    var curSpreadSum = 0.0;
    var curTotalSum = 0.0;
    var spreadCt = 0;
    var totalCt = 0;
    var curHML : ?Int = null;
    for (line in currentOdds.vals()) {
      switch (line.homeSpread) { case (?s) { curSpreadSum += s; spreadCt += 1 }; case null {} };
      switch (line.overUnder) { case (?t) { curTotalSum += t; totalCt += 1 }; case null {} };
      if (curHML == null) { curHML := line.homeMoneyline };
    };
    let curSpread : ?Float = if (spreadCt > 0) ?(curSpreadSum / floatOfNat(spreadCt)) else null;
    let curTotal : ?Float = if (totalCt > 0) ?(curTotalSum / floatOfNat(totalCt)) else null;

    let spreadMove = switch (openSpread, curSpread) {
      case (?os, ?cs) cs - os;
      case _ 0.0;
    };
    let totalMove = switch (openTotal, curTotal) {
      case (?ot, ?ct) ct - ot;
      case _ 0.0;
    };
    let absSpreadMove = if (spreadMove < 0.0) -spreadMove else spreadMove;
    let absTotalMove = if (totalMove < 0.0) -totalMove else totalMove;
    let steamAlert = absSpreadMove >= 1.5 or absTotalMove >= 3.0;
    // If spread moved negative (home giving fewer points), sharps backed home
    let sharpSide = if (absSpreadMove < 0.5) "NONE"
                    else if (spreadMove < 0.0) "HOME"
                    else "AWAY";

    ?{
      openingSpread = openSpread;
      currentSpread = curSpread;
      spreadMove;
      openingTotal = openTotal;
      currentTotal = curTotal;
      totalMove;
      steamAlert;
      sharpSide;
    };
  };

  // Fetch full investigation for a game — enriched with ref profile, rest, line movement, situational angles.
  public func getGameInvestigation(gameId : CommonTypes.GameId, gameDate : Text) : async CommonTypes.Result<GameTypes.GameInvestigation> {
    let bdlHeaders = [{ name = "Authorization"; value = "Bearer " # bdlApiKey }];
    let dateStr = if (gameDate == "") GamesLib.computeTodayDateStr() else gameDate;
    let todayStr = GamesLib.computeTodayDateStr();

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
      case null return #err(#notFound("Game " # gameId # " not found in BDL games for " # dateStr));
      case (?g) g;
    };

    // Fetch current odds
    let odds = try { await fetchOddsForTeam(game.homeTeam.name) } catch (_e) { [] };
    let discrepancies = GamesLib.detectDiscrepancies(odds);

    // Line movement (uses persistent opening store)
    let lineMovement = computeLineMovement(gameId, odds);

    // ESPN summary for referee profile — best effort
    let espnUrl = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=" # gameId;
    let espnCacheKey = "espn-summary-" # gameId;
    let espnJson = switch (CacheLib.get(cache, espnCacheKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(espnUrl, [], transform);
        } catch (_) { "" };
        if (fetched != "") { CacheLib.put(cache, espnCacheKey, fetched) };
        fetched;
      };
    };
    let refereeProfile = if (espnJson != "") RefsLib.getProfile(espnJson) else null;

    // Rest days — fetch each team's recent games (sequential to respect BDL rate limit)
    let homeRecentUrl = "https://api.balldontlie.io/v1/games?seasons[]=2025&team_ids[]=" # game.homeTeam.id # "&per_page=10";
    let homeRecentKey = "bdl-team-recent-" # game.homeTeam.id;
    let homeRecentJson = switch (CacheLib.get(cache, homeRecentKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(homeRecentUrl, bdlHeaders, transform);
        } catch (_) { "" };
        if (fetched != "") { CacheLib.put(cache, homeRecentKey, fetched) };
        fetched;
      };
    };
    let awayRecentUrl = "https://api.balldontlie.io/v1/games?seasons[]=2025&team_ids[]=" # game.awayTeam.id # "&per_page=10";
    let awayRecentKey = "bdl-team-recent-" # game.awayTeam.id;
    let awayRecentJson = switch (CacheLib.get(cache, awayRecentKey)) {
      case (?cached) cached;
      case null {
        let fetched = try {
          await OutCall.httpGetRequest(awayRecentUrl, bdlHeaders, transform);
        } catch (_) { "" };
        if (fetched != "") { CacheLib.put(cache, awayRecentKey, fetched) };
        fetched;
      };
    };

    let homeRestDays = computeRestDays(homeRecentJson, todayStr);
    let awayRestDays = computeRestDays(awayRecentJson, todayStr);

    let homeTeamFull = game.homeTeam.city # " " # game.homeTeam.name;
    let awayTeamFull = game.awayTeam.city # " " # game.awayTeam.name;

    let restAdvantage = ?SituationsLib.buildRestAdvantage(homeTeamFull, awayTeamFull, homeRestDays, awayRestDays);
    let situationalAngles = SituationsLib.detectAngles(homeTeamFull, awayTeamFull, homeRestDays, awayRestDays, odds);

    let emptyStats = func(tid : Text, restDays : Nat) : GameTypes.TeamStats {
      { teamId = tid; offensiveRating = null; defensiveRating = null; pace = null; pointsPerGame = null; recentForm = []; homeAwayRecord = ""; restDays };
    };

    #ok({
      game;
      homeTeamStats = emptyStats(game.homeTeam.id, homeRestDays);
      awayTeamStats = emptyStats(game.awayTeam.id, awayRestDays);
      injuries = [];
      odds;
      discrepancies;
      lineMovement;
      restAdvantage;
      situationalAngles;
      refereeProfile;
    });
  };

  // Compute days since the team's most recent game before today.
  func computeRestDays(recentGamesJson : Text, todayStr : Text) : Nat {
    if (recentGamesJson == "" or not GamesLib.textContains(recentGamesJson, "\"data\"")) return 1;
    // BDL games are sorted ascending — find the last date before or equal to today
    var lastDate = "";
    switch (GamesLib.textIndexOf(recentGamesJson, "\"data\":")) {
      case null return 1;
      case (?_) {};
    };
    // Scan all "date":"YYYY-MM-DD" values and track the latest one before today
    var searchFrom = 0;
    let dateKey = "\"date\":\"";
    label scan loop {
      switch (GamesLib.textIndexOf(GamesLib.textSubstring(recentGamesJson, searchFrom, recentGamesJson.size()), dateKey)) {
        case null break scan;
        case (?relPos) {
          let absPos = searchFrom + relPos + dateKey.size();
          let dateVal = GamesLib.textSubstring(recentGamesJson, absPos, absPos + 10);
          if (dateVal.size() == 10 and dateVal <= todayStr and dateVal > lastDate) {
            lastDate := dateVal;
          };
          searchFrom := absPos + 10;
        };
      };
    };
    if (lastDate == "") return 1;
    GamesLib.dateDiffDays(lastDate, todayStr);
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

  func floatOfNat(n : Nat) : Float {
    var acc = 0.0;
    var i = 0;
    while (i < n) { acc += 1.0; i += 1 };
    acc;
  };
};
