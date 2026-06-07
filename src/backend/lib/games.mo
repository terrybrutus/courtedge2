import CommonTypes "../types/common";
import GameTypes "../types/games";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Nat "mo:core/Nat";

import Time "mo:core/Time";
import Int "mo:core/Int";


module {
  // ── Ball Don't Lie — primary games source ────────────────────────────────

  // Compute today's date as "YYYY-MM-DD" from IC system time (nanoseconds).
  public func computeTodayDateStr() : Text {
    let nowNanos = Int.abs(Time.now());
    let nowSecs = nowNanos / 1_000_000_000;
    // Work in Int to avoid Nat underflow traps in Gregorian calculation
    let days : Int = (nowSecs / 86400 : Nat);
    let era : Int = (days + 719468) / 146097;
    let doe : Int = (days + 719468) - era * 146097;
    let yoe : Int = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    var y : Int = yoe + era * 400;
    let doy : Int = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp : Int = (5 * doy + 2) / 153;
    let d : Int = doy - (153 * mp + 2) / 5 + 1;
    let m : Int = if (mp < 10) { mp + 3 } else { mp - 9 };
    if (m <= 2) { y += 1 };
    let pad = func(n : Int) : Text {
      if (n < 10) { "0" # Int.toText(n) } else { Int.toText(n) }
    };
    Int.toText(y) # "-" # pad(m) # "-" # pad(d)
  };

  // Build Ball Don't Lie games URL for a given date string.
  public func buildBdlGamesUrl(dateStr : Text) : Text {
    "https://api.balldontlie.io/v1/games?dates[]=" # dateStr # "&postseason=true&per_page=100";
  };

  // Also include non-postseason to not miss any games
  public func buildBdlGamesUrlAll(dateStr : Text) : Text {
    "https://api.balldontlie.io/v1/games?dates[]=" # dateStr # "&per_page=100";
  };

  // Parse BDL status field into GameStatus and a display time string.
  // BDL status: "7:30 pm ET" (scheduled), "Final" or "Final/OT" (done), "Q3 2:15" (live),
  // or an ISO UTC timestamp like "2026-06-09T00:30:00Z" for upcoming games.
  public func parseBdlStatus(status : Text) : (GameTypes.GameStatus, Text) {
    if (textContains(status, "Final")) {
      (#final, "Final");
    } else if (textContains(status, "ET")) {
      // Scheduled: parse display time from status like "7:30 pm ET"
      let displayTime = parseBdlTime(status);
      (#scheduled, displayTime);
    } else if (status.size() >= 19 and textContains(status, "T") and textContains(status, "Z")) {
      // BDL v1 returns ISO UTC timestamp for scheduled games (e.g. "2026-06-09T00:30:00Z")
      // Convert UTC to ET display time (subtract 4h for EDT)
      let epoch = parseIsoToEpoch(status);
      let etEpochNat = if (epoch <= 4 * 3600) 0 else Int.abs(epoch) - 4 * 3600;
      let hh = (etEpochNat % 86400) / 3600;
      let mm = (etEpochNat % 3600) / 60;
      let period = if (hh >= 12) "PM" else "AM";
      let displayHour = if (hh == 0) 12 else if (hh > 12) hh - 12 else hh;
      let pad2 = func(n : Nat) : Text { if (n < 10) "0" # n.toText() else n.toText() };
      let displayTime = displayHour.toText() # ":" # pad2(mm) # " " # period # " ET";
      (#scheduled, displayTime);
    } else if (status == "" or status == "0") {
      (#scheduled, "");
    } else {
      // In-progress: status is something like "Q3 2:15"
      (#inProgress, status);
    };
  };

  // Normalize "7:30 pm ET" → "7:30 PM ET", handle both am/pm.
  func parseBdlTime(status : Text) : Text {
    let chars = status.toArray();
    let len = chars.size();
    // Find digits for hour:minute
    var i = 0;
    var timeStr = "";
    // Collect everything up to and including first "ET" occurrence or end
    while (i < len) {
      let c = chars[i];
      let cn = c.toNat32();
      if (cn >= 48 and cn <= 58) {
        // digit or colon
        timeStr #= c.toText();
      } else if (cn == 32 or cn == 9) {
        // space — check if next chars are am/pm
        if (i + 2 < len) {
          let next1 = chars[i + 1].toNat32();
          let next2 = chars[i + 2].toNat32();
          // am = 97,109  pm = 112,109  AM = 65,77  PM = 80,77
          if ((next1 == 97 or next1 == 65) and (next2 == 109 or next2 == 77)) {
            timeStr #= " AM";
            i += 3;
          } else if ((next1 == 112 or next1 == 80) and (next2 == 109 or next2 == 77)) {
            timeStr #= " PM";
            i += 3;
          } else {
            i += 1;
          };
        } else {
          i += 1;
        };
      } else {
        i += 1;
      };
    };
    if (timeStr == "") return status;
    timeStr # " ET"
  };

  // Parse the BDL JSON response into an array of Game records.
  // Shape: { "data": [ { "id": 123, "home_team": {...}, "visitor_team": {...}, "status": "...", ... } ] }
  public func parseBdlGames(json : Text) : [GameTypes.Game] {
    if (json == "") return [];
    // Find the "data" array
    let dataStart = switch (textIndexOf(json, "\"data\":")) {
      case null return [];
      case (?p) p + 7;
    };
    let arraySub = textSubstring(json, dataStart, json.size());
    // Find opening bracket of data array
    let bracketPos = switch (textIndexOf(arraySub, "[")) {
      case null return [];
      case (?p) p;
    };
    let arrayStr = textSubstring(arraySub, bracketPos, arraySub.size());
    let gameBlocks = splitTopLevelArrayElements(arrayStr);
    var games : [GameTypes.Game] = [];
    for (block in gameBlocks.vals()) {
      switch (parseOneBdlGame(block)) {
        case (?g) { games := games.concat([g]) };
        case null {};
      };
    };
    games;
  };

  func parseOneBdlGame(block : Text) : ?GameTypes.Game {
    // Extract top-level integer id (not quoted)
    let idRaw = extractRawIntAfterKey(block, "\"id\":");
    if (idRaw == "") return null;
    let gameId : CommonTypes.GameId = idRaw;

    // Extract home_team object
    let homeBlock = extractObjectAfterKey(block, "\"home_team\":");
    let visitorBlock = extractObjectAfterKey(block, "\"visitor_team\":");
    if (homeBlock == "" or visitorBlock == "") return null;

    let homeFullName = extractQuotedAfterKey(homeBlock, "\"full_name\":");
    let homeAbbr = extractQuotedAfterKey(homeBlock, "\"abbreviation\":");
    let homeCity = extractQuotedAfterKey(homeBlock, "\"city\":");
    let homeName = extractQuotedAfterKey(homeBlock, "\"name\":");

    let visFullName = extractQuotedAfterKey(visitorBlock, "\"full_name\":");
    let visAbbr = extractQuotedAfterKey(visitorBlock, "\"abbreviation\":");
    let visCity = extractQuotedAfterKey(visitorBlock, "\"city\":");
    let visName = extractQuotedAfterKey(visitorBlock, "\"name\":");

    if (homeFullName == "" or visFullName == "") return null;

    // BDL "date" field: "2026-05-27"
    let bdlDate = extractQuotedAfterKey(block, "\"date\":");
    let statusRaw = extractQuotedAfterKey(block, "\"status\":");
    let (gameStatus, displayTime) = parseBdlStatus(statusRaw);

    // Build ISO 8601 gameTime for JavaScript Date() parsing
    let gameTime = buildIsoGameTime(bdlDate, statusRaw, gameStatus);

    let homeTeam : GameTypes.Team = {
      id = if (homeAbbr != "") homeAbbr.toLower() else teamAbbreviation(homeFullName).toLower();
      name = if (homeName != "") homeName else shortTeamName(homeFullName);
      abbreviation = if (homeAbbr != "") homeAbbr else teamAbbreviation(homeFullName);
      city = if (homeCity != "") homeCity else teamCity(homeFullName);
      record = "";
    };
    let awayTeam : GameTypes.Team = {
      id = if (visAbbr != "") visAbbr.toLower() else teamAbbreviation(visFullName).toLower();
      name = if (visName != "") visName else shortTeamName(visFullName);
      abbreviation = if (visAbbr != "") visAbbr else teamAbbreviation(visFullName);
      city = if (visCity != "") visCity else teamCity(visFullName);
      record = "";
    };

    ?{
      id = gameId;
      homeTeam;
      awayTeam;
      gameTime;
      displayTime;
      status = gameStatus;
      venue = homeTeam.city # " Arena";
      series = null;
      odds = [];
    };
  };

  // Build an ISO 8601 UTC timestamp string from a BDL date ("2026-05-27") and status ("7:30 pm ET").
  // ET is UTC-4 during EDT (playoff season), so add 4 hours to convert to UTC.
  // Returns e.g. "2026-05-27T23:30:00Z"
  public func buildIsoGameTime(bdlDate : Text, statusRaw : Text, gameStatus : GameTypes.GameStatus) : Text {
    let dateStr = if (bdlDate.size() == 10) bdlDate else computeTodayDateStr();
    switch (gameStatus) {
      case (#final) {
        // Final game — use noon UTC as a stable parseable time
        dateStr # "T12:00:00Z";
      };
      case (#inProgress) {
        // In-progress — use current IC time converted to ISO
        let nowNanos = Int.abs(Time.now());
        let nowSecs = nowNanos / 1_000_000_000;
        epochSecsToIso(nowSecs);
      };
      case _ {
        // Scheduled — parse time to UTC ISO
        if (statusRaw.size() >= 19 and textContains(statusRaw, "T") and textContains(statusRaw, "Z")) {
          // statusRaw is already a UTC ISO timestamp from BDL v1 — use directly
          statusRaw;
        } else if (not textContains(statusRaw, "ET")) {
          // No time info — use midnight UTC of the game date
          dateStr # "T00:00:00Z";
        } else {
          // Parse "7:30 pm ET" → UTC ISO
          let (hour24, minute) = parseEtTime(statusRaw);
          let utcHour = (hour24 + 4) % 24;
          let pad = func(n : Nat) : Text {
            if (n < 10) "0" # n.toText() else n.toText()
          };
          let finalDate = if (hour24 + 4 >= 24) advanceDateByOne(dateStr) else dateStr;
          finalDate # "T" # pad(utcHour) # ":" # pad(minute) # ":00Z";
        };
      };
    };
  };

  // Parse "7:30 pm ET" or "12:00 AM ET" → (hour24 : Nat, minute : Nat)
  func parseEtTime(status : Text) : (Nat, Nat) {
    let chars = status.toArray();
    let len = chars.size();
    var i = 0;
    // Skip leading non-digits
    while (i < len and (chars[i].toNat32() < 48 or chars[i].toNat32() > 57)) { i += 1 };
    // Parse hours
    var hours : Nat = 0;
    while (i < len and chars[i].toNat32() >= 48 and chars[i].toNat32() <= 57) {
      hours := hours * 10 + (chars[i].toNat32() - 48).toNat();
      i += 1;
    };
    // Skip colon
    if (i < len and chars[i].toNat32() == 58) { i += 1 };
    // Parse minutes
    var minutes : Nat = 0;
    while (i < len and chars[i].toNat32() >= 48 and chars[i].toNat32() <= 57) {
      minutes := minutes * 10 + (chars[i].toNat32() - 48).toNat();
      i += 1;
    };
    // Skip spaces
    while (i < len and chars[i].toNat32() == 32) { i += 1 };
    // Check am/pm
    var isPm = false;
    if (i + 1 < len) {
      let c1 = chars[i].toNat32();
      let c2 = chars[i + 1].toNat32();
      // pm = 112,109 or 80,77
      if ((c1 == 112 or c1 == 80) and (c2 == 109 or c2 == 77)) {
        isPm := true;
      };
    };
    // Convert to 24h
    let hour24 : Nat = if (isPm and hours != 12) hours + 12
                       else if (not isPm and hours == 12) 0
                       else hours;
    (hour24, minutes);
  };

  // Advance a "YYYY-MM-DD" date string by one day (simple, handles end-of-month via epoch math).
  func advanceDateByOne(dateStr : Text) : Text {
    if (dateStr.size() < 10) return dateStr;
    let epochSec = parseIsoToEpoch(dateStr # "T00:00:00Z");
    epochSecsToIso(Int.abs(epochSec) + 86400);
  };

  // Convert epoch seconds (Nat) to "YYYY-MM-DDT...:00Z" ISO string.
  // Used for in-progress games and date advancement.
  public func epochSecsToIso(secs : Nat) : Text {
    var days = secs / 86400;
    let timeOfDay = secs % 86400;
    let hh = timeOfDay / 3600;
    let mm = (timeOfDay % 3600) / 60;
    let ss = timeOfDay % 60;
    // Gregorian calendar from days since epoch
    var era = (days + 719468) / 146097;
    var doe = (days + 719468) - era * 146097;
    var yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    var mp = (5 * doy + 2) / 153;
    var d = doy - (153 * mp + 2) / 5 + 1;
    var m = if (mp < 10) mp + 3 else mp - 9;
    if (m <= 2) { y := y + 1 };
    let pad = func(n : Nat) : Text {
      if (n < 10) "0" # n.toText() else n.toText()
    };
    y.toText() # "-" # pad(m) # "-" # pad(d) # "T" # pad(hh) # ":" # pad(mm) # ":" # pad(ss) # "Z";
  };

  // Extract a raw (unquoted) integer value immediately after a key.
  // e.g. for {"id":123,...} with key "\"id\":" returns "123"
  func extractRawIntAfterKey(json : Text, key : Text) : Text {
    switch (textIndexOf(json, key)) {
      case null "";
      case (?pos) {
        let start = pos + key.size();
        let chars = json.toArray();
        let len = chars.size();
        var i = start;
        // Skip whitespace
        while (i < len and (chars[i].toNat32() == 32 or chars[i].toNat32() == 9)) { i += 1 };
        var result = "";
        while (i < len) {
          let cn = chars[i].toNat32();
          if (cn >= 48 and cn <= 57) {
            result #= chars[i].toText();
          } else {
            i := len; // break
          };
          i += 1;
        };
        result;
      };
    };
  };

  // Extract the JSON object string immediately after a key (finds matching braces).
  public func extractObjectAfterKey(json : Text, key : Text) : Text {
    switch (textIndexOf(json, key)) {
      case null "";
      case (?pos) {
        let start = pos + key.size();
        let chars = json.toArray();
        let len = chars.size();
        var i = start;
        while (i < len and chars[i].toNat32() != 123) { i += 1 };
        if (i >= len) return "";
        let objStart = i;
        var depth = 0;
        var inStr = false;
        var esc = false;
        label scan while (i < len) {
          let cn = chars[i].toNat32();
          if (esc) { esc := false }
          else if (inStr) {
            if (cn == 92) { esc := true }
            else if (cn == 34) { inStr := false };
          } else {
            if (cn == 34) { inStr := true }
            else if (cn == 123) { depth += 1 }
            else if (cn == 125) {
              depth -= 1;
              if (depth == 0) {
                return textSubstring(json, objStart, i + 1);
              };
            };
          };
          i += 1;
        };
        "";
      };
    };
  };

  // ── The Odds API — secondary/optional overlay ─────────────────────────────

  public func buildOddsApiUrl(apiKey : Text) : Text {
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=" # apiKey # "&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso";
  };

  // Keep legacy name for any callers that still reference it
  public func buildOddsApiGamesUrl(apiKey : Text) : Text {
    buildOddsApiUrl(apiKey);
  };

  // ESPN summary for team/injury enrichment only (secondary)
  public func buildEspnSummaryUrl(gameId : CommonTypes.GameId) : Text {
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=" # gameId;
  };

  // Parse The Odds API JSON array into Game array (legacy, used for odds overlay).
  public func parseOddsApiGames(json : Text) : CommonTypes.Result<[GameTypes.Game]> {
    if (json == "") return #err(#parseError("Odds API returned an empty response"));
    if (not textContains(json, "home_team")) {
      let preview = if (json.size() > 400) textSubstring(json, 0, 400) # "..." else json;
      return #err(#parseError("Odds API response missing 'home_team'. Raw: " # preview));
    };
    let gameBlocks = splitTopLevelArrayElements(json);
    var games : [GameTypes.Game] = [];
    for (block in gameBlocks.vals()) {
      switch (parseOneOddsApiGame(block)) {
        case (?g) { games := games.concat([g]) };
        case null {};
      };
    };
    #ok(games);
  };

  func parseOneOddsApiGame(block : Text) : ?GameTypes.Game {
    let id = extractQuotedAfterKey(block, "\"id\":");
    if (id == "") return null;
    let homeTeamName = extractQuotedAfterKey(block, "\"home_team\":");
    let awayTeamName = extractQuotedAfterKey(block, "\"away_team\":");
    if (homeTeamName == "" or awayTeamName == "") return null;
    let commenceTime = extractQuotedAfterKey(block, "\"commence_time\":");
    let status = classifyOddsApiStatus(commenceTime);
    let homeTeam : GameTypes.Team = {
      id = teamNameToId(homeTeamName);
      name = shortTeamName(homeTeamName);
      abbreviation = teamAbbreviation(homeTeamName);
      city = teamCity(homeTeamName);
      record = "";
    };
    let awayTeam : GameTypes.Team = {
      id = teamNameToId(awayTeamName);
      name = shortTeamName(awayTeamName);
      abbreviation = teamAbbreviation(awayTeamName);
      city = teamCity(awayTeamName);
      record = "";
    };
    // commenceTime is already ISO 8601 from Odds API, use it directly
    // displayTime: convert UTC to ET display string (subtract 4h)
    let displayTime = if (commenceTime.size() >= 16) {
      let epoch = parseIsoToEpoch(commenceTime);
      let etSec : Int = epoch - 4 * 3600;
      let etSecNat = if (etSec < 0) 0 else Int.abs(etSec);
      let hh = (etSecNat % 86400) / 3600;
      let mm = (etSecNat % 3600) / 60;
      let period = if (hh >= 12) "PM" else "AM";
      let displayHour = if (hh == 0) 12 else if (hh > 12) hh - 12 else hh;
      let pad = func(n : Nat) : Text { if (n < 10) "0" # n.toText() else n.toText() };
      displayHour.toText() # ":" # pad(mm) # " " # period # " ET";
    } else "";
    ?{
      id;
      homeTeam;
      awayTeam;
      gameTime = commenceTime;
      displayTime;
      status;
      venue = teamCity(homeTeamName) # " Arena";
      series = null;
      odds = [];
    };
  };

  // Determine game status from UTC ISO timestamp vs current time.
  func classifyOddsApiStatus(commenceTime : Text) : GameTypes.GameStatus {
    if (commenceTime == "") return #scheduled;
    let nowNs = Time.now();
    let nowSec : Int = nowNs / 1_000_000_000;
    let gameSec = parseIsoToEpoch(commenceTime);
    let fourHoursSec : Int = 4 * 3600;
    if (gameSec <= nowSec and nowSec <= gameSec + fourHoursSec) return #inProgress;
    if (nowSec > gameSec + fourHoursSec) return #final;
    #scheduled;
  };

  // Parse ISO 8601 UTC string to Unix epoch seconds (integer math only).
  // Format: "2026-05-25T01:00:00Z"
  public func parseIsoToEpoch(iso : Text) : Int {
    if (iso.size() < 19) return 0;
    let chars = iso.toArray();
    let year = parseDigits(chars, 0, 4);
    let month = parseDigits(chars, 5, 2);
    let day = parseDigits(chars, 8, 2);
    let hour = parseDigits(chars, 11, 2);
    let minute = parseDigits(chars, 14, 2);
    let second = parseDigits(chars, 17, 2);
    let daysToYear = daysFromEpochToYear(year);
    let daysToMonth = daysInMonthsBefore(month, year);
    let totalDays : Int = daysToYear + daysToMonth + (day : Int) - 1;
    totalDays * 86400 + (hour : Int) * 3600 + (minute : Int) * 60 + (second : Int);
  };

  func parseDigits(chars : [Char], start : Nat, len : Nat) : Int {
    var val : Int = 0;
    var i = start;
    while (i < start + len and i < chars.size()) {
      let cn = chars[i].toNat32();
      if (cn >= 48 and cn <= 57) { val := val * 10 + (cn - 48).toNat() };
      i += 1;
    };
    val;
  };

  func daysFromEpochToYear(year : Int) : Int {
    let y = year - 1;
    let leaps = y / 4 - y / 100 + y / 400;
    let base1970leaps : Int = 1969 / 4 - 1969 / 100 + 1969 / 400;
    (year - 1970) * 365 + (leaps - base1970leaps);
  };

  func daysInMonthsBefore(month : Int, year : Int) : Int {
    let leap = isLeapYear(year);
    let days : [Int] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var total : Int = 0;
    var m : Int = 1;
    while (m < month) {
      total += if (m == 2 and leap) 29 else days[m.toNat()];
      m += 1;
    };
    total;
  };

  func isLeapYear(year : Int) : Bool {
    (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0);
  };

  // Split top-level JSON array elements into individual object strings.
  public func splitTopLevelArrayElements(json : Text) : [Text] {
    let chars = json.toArray();
    let len = chars.size();
    var i = 0;
    while (i < len and chars[i].toNat32() != 91) { i += 1 };
    if (i >= len) return [];
    i += 1;
    var elements : [Text] = [];
    label outer while (i < len) {
      while (i < len and (chars[i].toNat32() == 44 or chars[i].toNat32() == 32 or chars[i].toNat32() == 10 or chars[i].toNat32() == 13 or chars[i].toNat32() == 9)) {
        i += 1;
      };
      if (i >= len or chars[i].toNat32() == 93) break outer;
      if (chars[i].toNat32() != 123) { i += 1 } else {
        let blockStart = i;
        var depth = 0;
        var inStr = false;
        var esc = false;
        label scan while (i < len) {
          let cn = chars[i].toNat32();
          if (esc) { esc := false }
          else if (inStr) {
            if (cn == 92) { esc := true }
            else if (cn == 34) { inStr := false };
          } else {
            if (cn == 34) { inStr := true }
            else if (cn == 123) { depth += 1 }
            else if (cn == 125) {
              depth -= 1;
              if (depth == 0) {
                elements := elements.concat([textSubstring(json, blockStart, i + 1)]);
                i += 1;
                break scan;
              };
            };
          };
          i += 1;
        };
      };
    };
    elements;
  };

  // Extract odds lines from The Odds API game object bookmakers array.
  public func extractOddsFromGame(block : Text) : [GameTypes.OddsLine] {
    if (not textContains(block, "bookmakers")) return [];
    switch (textIndexOf(block, "\"bookmakers\":")) {
      case null [];
      case (?bpos) {
        let sub = textSubstring(block, bpos, block.size());
        let arrStart = switch (textIndexOf(sub, "[")) {
          case null return [];
          case (?apos) apos;
        };
        let bookmakerBlocks = splitTopLevelArrayElements(textSubstring(sub, arrStart, sub.size()));
        var lines : [GameTypes.OddsLine] = [];
        for (bm in bookmakerBlocks.vals()) {
          switch (parseOneBookmakerFromGame(bm)) {
            case (?l) { lines := lines.concat([l]) };
            case null {};
          };
        };
        lines;
      };
    };
  };

  func parseOneBookmakerFromGame(bm : Text) : ?GameTypes.OddsLine {
    let key = extractQuotedAfterKey(bm, "\"key\":");
    if (key == "") return null;
    var homeML : ?Int = null;
    var awayML : ?Int = null;
    var homeSpread : ?Float = null;
    var awaySpread : ?Float = null;
    var overUnder : ?Float = null;
    var homeSpreadOdds : ?Int = ?(-110);
    var awaySpreadOdds : ?Int = ?(-110);
    var overOdds : ?Int = ?(-110);
    var underOdds : ?Int = ?(-110);
    switch (textIndexOf(bm, "\"markets\":")) {
      case null {};
      case (?mpos) {
        let msub = textSubstring(bm, mpos, bm.size());
        let marketStart = switch (textIndexOf(msub, "[")) {
          case null return null;
          case (?ap) ap;
        };
        let marketBlocks = splitTopLevelArrayElements(textSubstring(msub, marketStart, msub.size()));
        for (market in marketBlocks.vals()) {
          let mkey = extractQuotedAfterKey(market, "\"key\":");
          switch (textIndexOf(market, "\"outcomes\":")) {
            case null {};
            case (?opos) {
              let osub = textSubstring(market, opos, market.size());
              let outcomeStart = switch (textIndexOf(osub, "[")) {
                case null return null;
                case (?ap) ap;
              };
              let outcomeBlocks = splitTopLevelArrayElements(textSubstring(osub, outcomeStart, osub.size()));
              if (mkey == "h2h") {
                if (outcomeBlocks.size() >= 1) {
                  homeML := parseInt(extractRawAfterKey(outcomeBlocks[0], "\"price\":"));
                };
                if (outcomeBlocks.size() >= 2) {
                  awayML := parseInt(extractRawAfterKey(outcomeBlocks[1], "\"price\":"));
                };
              } else if (mkey == "spreads") {
                for (oc in outcomeBlocks.vals()) {
                  let pt = parseFloatText(extractRawAfterKey(oc, "\"point\":"));
                  let odds = parseInt(extractRawAfterKey(oc, "\"price\":"));
                  if (homeSpread == null) {
                    homeSpread := pt;
                    homeSpreadOdds := switch (odds) { case (?v) ?v; case null ?(-110) };
                  } else {
                    awaySpread := pt;
                    awaySpreadOdds := switch (odds) { case (?v) ?v; case null ?(-110) };
                  };
                };
                if (awaySpread == null) {
                  awaySpread := switch (homeSpread) { case null null; case (?s) ?(-s) };
                };
              } else if (mkey == "totals") {
                for (oc in outcomeBlocks.vals()) {
                  let ocName = extractQuotedAfterKey(oc, "\"name\":");
                  let pt = parseFloatText(extractRawAfterKey(oc, "\"point\":"));
                  let odds = parseInt(extractRawAfterKey(oc, "\"price\":"));
                  if (overUnder == null) { overUnder := pt };
                  if (ocName == "Over") {
                    overOdds := switch (odds) { case (?v) ?v; case null ?(-110) };
                  } else if (ocName == "Under") {
                    underOdds := switch (odds) { case (?v) ?v; case null ?(-110) };
                  };
                };
              };
            };
          };
        };
      };
    };
    if (homeML == null and homeSpread == null and overUnder == null) return null;
    let updatedAt = extractQuotedAfterKey(bm, "\"last_update\":");
    ?{
      bookmaker = key;
      homeMoneyline = homeML;
      awayMoneyline = awayML;
      homeSpread;
      awaySpread;
      homeSpreadOdds;
      awaySpreadOdds;
      overUnder;
      overOdds;
      underOdds;
      updatedAt;
    };
  };

  // Detect discrepancies between bookmaker lines.
  public func detectDiscrepancies(odds : [GameTypes.OddsLine]) : [GameTypes.Discrepancy] {
    if (odds.size() < 2) return [];
    var discrepancies : [GameTypes.Discrepancy] = [];
    var minOU = 999.0;
    var maxOU = 0.0;
    var minOUBook = "";
    var maxOUBook = "";
    for (line in odds.vals()) {
      switch (line.overUnder) {
        case (?ou) {
          if (ou < minOU) { minOU := ou; minOUBook := line.bookmaker };
          if (ou > maxOU) { maxOU := ou; maxOUBook := line.bookmaker };
        };
        case null {};
      };
    };
    let ouGap = maxOU - minOU;
    if (ouGap > 1.0 and minOU < 999.0) {
      discrepancies := discrepancies.concat([{
        betType = "Over/Under";
        minValue = minOU;
        maxValue = maxOU;
        minBook = minOUBook;
        maxBook = maxOUBook;
        gap = ouGap;
      }]);
    };
    var minSpread = 999.0;
    var maxSpread = -999.0;
    var minSpreadBook = "";
    var maxSpreadBook = "";
    for (line in odds.vals()) {
      switch (line.homeSpread) {
        case (?sp) {
          if (sp < minSpread) { minSpread := sp; minSpreadBook := line.bookmaker };
          if (sp > maxSpread) { maxSpread := sp; maxSpreadBook := line.bookmaker };
        };
        case null {};
      };
    };
    let spreadGap = Float.abs(maxSpread - minSpread);
    if (spreadGap > 0.5 and minSpread < 999.0) {
      discrepancies := discrepancies.concat([{
        betType = "Spread";
        minValue = minSpread;
        maxValue = maxSpread;
        minBook = minSpreadBook;
        maxBook = maxSpreadBook;
        gap = spreadGap;
      }]);
    };
    discrepancies;
  };

  // Parse injury reports from ESPN summary JSON (enrichment only).
  public func parseInjuriesFromEspn(json : Text) : [GameTypes.InjuryReport] {
    if (json == "" or not textContains(json, "\"injuries\"")) return [];
    var reports : [GameTypes.InjuryReport] = [];
    let chars = json.toArray();
    let len = chars.size();
    switch (textIndexOf(json, "\"injuries\":")) {
      case null return [];
      case (?injPos) {
        var i = injPos + 12;
        while (i < len and chars[i].toNat32() != 91) { i += 1 };
        if (i >= len) return [];
        i += 1;
        label injLoop while (i < len) {
          while (i < len and (chars[i].toNat32() == 44 or chars[i].toNat32() == 32 or chars[i].toNat32() == 10 or chars[i].toNat32() == 13)) { i += 1 };
          if (i >= len or chars[i].toNat32() == 93) break injLoop;
          if (chars[i].toNat32() != 123) { i += 1 } else {
            let blockStart = i;
            var depth = 0;
            var inStr = false;
            var esc = false;
            label bscan while (i < len) {
              let cn = chars[i].toNat32();
              if (esc) { esc := false }
              else if (inStr) {
                if (cn == 92) { esc := true }
                else if (cn == 34) { inStr := false };
              } else {
                if (cn == 34) { inStr := true }
                else if (cn == 123) { depth += 1 }
                else if (cn == 125) {
                  depth -= 1;
                  if (depth == 0) {
                    let block = textSubstring(json, blockStart, i + 1);
                    let playerName = extractQuotedAfterKey(block, "\"displayName\":");
                    let status = extractQuotedAfterKey(block, "\"status\":");
                    let description = extractQuotedAfterKey(block, "\"longComment\":");
                    let team = extractQuotedAfterKey(block, "\"abbreviation\":");
                    let playerId = extractQuotedAfterKey(block, "\"athlete\":{\"id\":");
                    if (playerName != "") {
                      reports := reports.concat([{
                        playerId;
                        playerName;
                        team;
                        status;
                        description = if (description == "") status else description;
                        updatedAt = "";
                      }]);
                    };
                    i += 1;
                    break bscan;
                  };
                };
              };
              i += 1;
            };
          };
        };
      };
    };
    reports;
  };

  // ── Team name lookup helpers ──────────────────────────────────────────────

  public func shortTeamName(fullName : Text) : Text {
    if (textContains(fullName, "Thunder")) "Thunder"
    else if (textContains(fullName, "Spurs")) "Spurs"
    else if (textContains(fullName, "Knicks")) "Knicks"
    else if (textContains(fullName, "Celtics")) "Celtics"
    else if (textContains(fullName, "Heat")) "Heat"
    else if (textContains(fullName, "Cavaliers")) "Cavaliers"
    else if (textContains(fullName, "Pacers")) "Pacers"
    else if (textContains(fullName, "Bucks")) "Bucks"
    else if (textContains(fullName, "76ers")) "76ers"
    else if (textContains(fullName, "Raptors")) "Raptors"
    else if (textContains(fullName, "Magic")) "Magic"
    else if (textContains(fullName, "Wizards")) "Wizards"
    else if (textContains(fullName, "Bulls")) "Bulls"
    else if (textContains(fullName, "Pistons")) "Pistons"
    else if (textContains(fullName, "Hornets")) "Hornets"
    else if (textContains(fullName, "Hawks")) "Hawks"
    else if (textContains(fullName, "Nets")) "Nets"
    else if (textContains(fullName, "Warriors")) "Warriors"
    else if (textContains(fullName, "Lakers")) "Lakers"
    else if (textContains(fullName, "Clippers")) "Clippers"
    else if (textContains(fullName, "Suns")) "Suns"
    else if (textContains(fullName, "Nuggets")) "Nuggets"
    else if (textContains(fullName, "Jazz")) "Jazz"
    else if (textContains(fullName, "Grizzlies")) "Grizzlies"
    else if (textContains(fullName, "Trail Blazers") or textContains(fullName, "Blazers")) "Trail Blazers"
    else if (textContains(fullName, "Kings")) "Kings"
    else if (textContains(fullName, "Mavericks")) "Mavericks"
    else if (textContains(fullName, "Rockets")) "Rockets"
    else if (textContains(fullName, "Pelicans")) "Pelicans"
    else if (textContains(fullName, "Timberwolves")) "Timberwolves"
    else fullName;
  };

  public func teamAbbreviation(fullName : Text) : Text {
    if (textContains(fullName, "Thunder")) "OKC"
    else if (textContains(fullName, "Spurs")) "SAS"
    else if (textContains(fullName, "Knicks")) "NYK"
    else if (textContains(fullName, "Celtics")) "BOS"
    else if (textContains(fullName, "Heat")) "MIA"
    else if (textContains(fullName, "Cavaliers")) "CLE"
    else if (textContains(fullName, "Pacers")) "IND"
    else if (textContains(fullName, "Bucks")) "MIL"
    else if (textContains(fullName, "76ers")) "PHI"
    else if (textContains(fullName, "Raptors")) "TOR"
    else if (textContains(fullName, "Magic")) "ORL"
    else if (textContains(fullName, "Wizards")) "WSH"
    else if (textContains(fullName, "Bulls")) "CHI"
    else if (textContains(fullName, "Pistons")) "DET"
    else if (textContains(fullName, "Hornets")) "CHA"
    else if (textContains(fullName, "Hawks")) "ATL"
    else if (textContains(fullName, "Nets")) "BKN"
    else if (textContains(fullName, "Warriors")) "GSW"
    else if (textContains(fullName, "Lakers")) "LAL"
    else if (textContains(fullName, "Clippers")) "LAC"
    else if (textContains(fullName, "Suns")) "PHX"
    else if (textContains(fullName, "Nuggets")) "DEN"
    else if (textContains(fullName, "Jazz")) "UTA"
    else if (textContains(fullName, "Grizzlies")) "MEM"
    else if (textContains(fullName, "Trail Blazers") or textContains(fullName, "Blazers")) "POR"
    else if (textContains(fullName, "Kings")) "SAC"
    else if (textContains(fullName, "Mavericks")) "DAL"
    else if (textContains(fullName, "Rockets")) "HOU"
    else if (textContains(fullName, "Pelicans")) "NOP"
    else if (textContains(fullName, "Timberwolves")) "MIN"
    else "NBA";
  };

  public func teamCity(fullName : Text) : Text {
    if (textContains(fullName, "Thunder")) "Oklahoma City"
    else if (textContains(fullName, "Spurs")) "San Antonio"
    else if (textContains(fullName, "Knicks")) "New York"
    else if (textContains(fullName, "Celtics")) "Boston"
    else if (textContains(fullName, "Heat")) "Miami"
    else if (textContains(fullName, "Cavaliers")) "Cleveland"
    else if (textContains(fullName, "Pacers")) "Indiana"
    else if (textContains(fullName, "Bucks")) "Milwaukee"
    else if (textContains(fullName, "76ers")) "Philadelphia"
    else if (textContains(fullName, "Raptors")) "Toronto"
    else if (textContains(fullName, "Magic")) "Orlando"
    else if (textContains(fullName, "Wizards")) "Washington"
    else if (textContains(fullName, "Bulls")) "Chicago"
    else if (textContains(fullName, "Pistons")) "Detroit"
    else if (textContains(fullName, "Hornets")) "Charlotte"
    else if (textContains(fullName, "Hawks")) "Atlanta"
    else if (textContains(fullName, "Nets")) "Brooklyn"
    else if (textContains(fullName, "Warriors")) "Golden State"
    else if (textContains(fullName, "Lakers")) "Los Angeles"
    else if (textContains(fullName, "Clippers")) "Los Angeles"
    else if (textContains(fullName, "Suns")) "Phoenix"
    else if (textContains(fullName, "Nuggets")) "Denver"
    else if (textContains(fullName, "Jazz")) "Utah"
    else if (textContains(fullName, "Grizzlies")) "Memphis"
    else if (textContains(fullName, "Trail Blazers") or textContains(fullName, "Blazers")) "Portland"
    else if (textContains(fullName, "Kings")) "Sacramento"
    else if (textContains(fullName, "Mavericks")) "Dallas"
    else if (textContains(fullName, "Rockets")) "Houston"
    else if (textContains(fullName, "Pelicans")) "New Orleans"
    else if (textContains(fullName, "Timberwolves")) "Minnesota"
    else fullName;
  };

  public func teamNameToId(fullName : Text) : Text {
    teamAbbreviation(fullName).toLower();
  };

  // ── Text parsing utilities ────────────────────────────────────────────────

  public func textContains(haystack : Text, needle : Text) : Bool {
    textIndexOf(haystack, needle) != null;
  };

  public func textIndexOf(haystack : Text, needle : Text) : ?Nat {
    if (needle.size() == 0) return ?0;
    if (needle.size() > haystack.size()) return null;
    let hArray = haystack.toArray();
    let nArray = needle.toArray();
    let hLen = hArray.size();
    let nLen = nArray.size();
    var i = 0;
    label search while (i + nLen <= hLen) {
      var match = true;
      var j = 0;
      while (j < nLen) {
        if (hArray[i + j] != nArray[j]) { match := false };
        j += 1;
      };
      if (match) return ?i;
      i += 1;
    };
    null;
  };

  public func extractQuotedAfterKey(json : Text, key : Text) : Text {
    switch (textIndexOf(json, key)) {
      case null "";
      case (?pos) {
        let start = pos + key.size();
        let chars = json.toArray();
        let len = chars.size();
        var i = start;
        while (i < len and chars[i].toNat32() != 34) { i += 1 };
        if (i >= len) return "";
        i += 1;
        var result = "";
        while (i < len and chars[i].toNat32() != 34) {
          result #= (chars[i]).toText();
          i += 1;
        };
        result;
      };
    };
  };

  func extractRawAfterKey(json : Text, key : Text) : Text {
    switch (textIndexOf(json, key)) {
      case null "";
      case (?pos) {
        let start = pos + key.size();
        let chars = json.toArray();
        let len = chars.size();
        var i = start;
        while (i < len and (chars[i].toNat32() == 32 or chars[i].toNat32() == 9)) { i += 1 };
        var result = "";
        while (i < len and chars[i].toNat32() != 44 and chars[i].toNat32() != 125 and chars[i].toNat32() != 93 and chars[i].toNat32() != 32) {
          result #= (chars[i]).toText();
          i += 1;
        };
        result;
      };
    };
  };

  public func textSubstring(s : Text, from : Nat, to : Nat) : Text {
    let chars = s.toArray();
    let len = chars.size();
    let actualTo = if (to > len) len else to;
    if (from >= actualTo) return "";
    var result = "";
    var i = from;
    while (i < actualTo) {
      result #= (chars[i]).toText();
      i += 1;
    };
    result;
  };

  func parseInt(s : Text) : ?Int {
    if (s == "") return null;
    let chars = s.toArray();
    var i = 0;
    var negative = false;
    if (i < chars.size() and chars[i].toNat32() == 45) { negative := true; i += 1 };
    var value : Int = 0;
    var valid = false;
    while (i < chars.size()) {
      let cn = chars[i].toNat32();
      if (cn >= 48 and cn <= 57) {
        value := value * 10 + (cn - 48).toNat();
        valid := true;
      } else {
        i := chars.size();
      };
      i += 1;
    };
    if (not valid) return null;
    ?(if (negative) -value else value);
  };

  public func parseFloatText(s : Text) : ?Float {
    if (s == "") return null;
    let clean = if (s.size() > 0 and s.toArray()[0].toNat32() == 34) {
      textSubstring(s, 1, s.size() - 1);
    } else s;
    var intPart = 0;
    var fracPart = 0.0;
    var fracDiv = 1.0;
    var hasDot = false;
    var valid = false;
    var negative = false;
    let chars = clean.toArray();
    var i = 0;
    if (i < chars.size() and chars[i].toNat32() == 45) { negative := true; i += 1 };
    while (i < chars.size()) {
      let c = chars[i];
      let cn = c.toNat32();
      if (cn >= 48 and cn <= 57) {
        let digit = Nat.fromText((c).toText());
        switch digit {
          case (?d) {
            if (hasDot) {
              fracDiv *= 10.0;
              fracPart += d.toFloat() / fracDiv;
            } else {
              intPart := intPart * 10 + d;
            };
            valid := true;
          };
          case null {};
        };
      } else if (cn == 46 and not hasDot) {
        hasDot := true;
      } else {
        i := chars.size();
      };
      i += 1;
    };
    if (not valid) return null;
    let result = intPart.toFloat() + fracPart;
    ?(if (negative) -result else result);
  };

  // Advance a "YYYY-MM-DD" date string by `days` days.
  public func advanceDateStr(dateStr : Text, days : Nat) : Text {
    if (dateStr.size() < 10 or days == 0) return dateStr;
    let epochSec = parseIsoToEpoch(dateStr # "T00:00:00Z");
    epochSecsToIso(Int.abs(epochSec) + days * 86400);
  };

  // Extract just the YYYY-MM-DD portion from an ISO datetime string.
  public func datePart(iso : Text) : Text {
    if (iso.size() >= 10) textSubstring(iso, 0, 10) else iso;
  };

  // Convert a UTC ISO gameTime to its ET date string (UTC−4 for EDT during playoffs).
  // E.g. "2026-06-09T00:30:00Z" → "2026-06-08" (8:30 PM ET on June 8)
  func etDateFromGameTime(gameTime : Text) : Text {
    if (gameTime.size() < 20) return datePart(gameTime);
    let epoch = parseIsoToEpoch(gameTime);
    if (epoch <= 4 * 3600) return datePart(gameTime);
    let etNat = Int.abs(epoch) - 4 * 3600;
    textSubstring(epochSecsToIso(etNat), 0, 10);
  };

  // Find the earliest game date (in ET) across a list of games (returns fallback if empty).
  public func earliestGameDate(games : [GameTypes.Game], fallback : Text) : Text {
    var earliest = fallback;
    var found = false;
    for (g in games.vals()) {
      let d = etDateFromGameTime(g.gameTime);
      if (d.size() == 10) {
        if (not found or d < earliest) {
          earliest := d;
          found := true;
        };
      };
    };
    earliest;
  };

  // Filter games to only those whose ET game date matches targetDate (YYYY-MM-DD).
  public func filterGamesByDate(games : [GameTypes.Game], targetDate : Text) : [GameTypes.Game] {
    var result : [GameTypes.Game] = [];
    for (g in games.vals()) {
      if (etDateFromGameTime(g.gameTime) == targetDate) {
        result := result.concat([g]);
      };
    };
    result;
  };

  // Find the last occurrence of needle in haystack; returns the starting index or null.
  public func textLastIndexOf(haystack : Text, needle : Text) : ?Nat {
    if (needle.size() == 0 or needle.size() > haystack.size()) return null;
    let hArray = haystack.toArray();
    let nArray = needle.toArray();
    let hLen = hArray.size();
    let nLen = nArray.size();
    var lastFound : ?Nat = null;
    var i = 0;
    while (i + nLen <= hLen) {
      var match = true;
      var j = 0;
      while (j < nLen) {
        if (hArray[i + j] != nArray[j]) { match := false };
        j += 1;
      };
      if (match) { lastFound := ?i };
      i += 1;
    };
    lastFound;
  };

  // Parse "YYYY-MM-DD" into (year, month, day) as Nat tuple.
  // Returns (0, 0, 0) on parse failure.
  public func parseDateComponents(s : Text) : (Nat, Nat, Nat) {
    if (s.size() < 10) return (0, 0, 0);
    let chars = s.toArray();
    let y1 = (chars[0].toNat32() : Nat) - 48;
    let y2 = (chars[1].toNat32() : Nat) - 48;
    let y3 = (chars[2].toNat32() : Nat) - 48;
    let y4 = (chars[3].toNat32() : Nat) - 48;
    let m1 = (chars[5].toNat32() : Nat) - 48;
    let m2 = (chars[6].toNat32() : Nat) - 48;
    let d1 = (chars[8].toNat32() : Nat) - 48;
    let d2 = (chars[9].toNat32() : Nat) - 48;
    (y1 * 1000 + y2 * 100 + y3 * 10 + y4, m1 * 10 + m2, d1 * 10 + d2);
  };

  // Convert (year, month, day) to a Julian Day Number (for date arithmetic).
  func toJulianDay(year : Nat, month : Nat, day : Nat) : Nat {
    let a = (14 - month) / 12;
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
  };

  // Compute absolute day difference between two "YYYY-MM-DD" strings.
  public func dateDiffDays(a : Text, b : Text) : Nat {
    let (ay, am, ad) = parseDateComponents(a);
    let (by, bm, bd) = parseDateComponents(b);
    if (ay == 0 or by == 0) return 0;
    let jdA = toJulianDay(ay, am, ad);
    let jdB = toJulianDay(by, bm, bd);
    if (jdA > jdB) jdA - jdB else jdB - jdA;
  };

}
