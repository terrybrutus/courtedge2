import TotalTypes "../types/totals";
import GamesLib "games";

module {
  // Hardcoded NBA referee tendency profiles based on historical data.
  // overRate: fraction of their games that historically go OVER the posted total.
  // avgFoulsPerGame: total personal fouls called per game (both teams combined).
  func lookup(name : Text) : ?TotalTypes.RefereeProfile {
    if (GamesLib.textContains(name, "Tony Brothers") or GamesLib.textContains(name, "Brothers")) {
      ?{ name; avgFoulsPerGame = ?44.2; avgFreeThrowsPerGame = ?38.1; overRate = ?0.58;
         tendency = "High foul game. Tony Brothers calls fouls at the highest rate in the league — lean OVER, expect FT volume." }
    } else if (GamesLib.textContains(name, "Scott Foster") or (GamesLib.textContains(name, "Foster") and not GamesLib.textContains(name, "Fitzgerald"))) {
      ?{ name; avgFoulsPerGame = ?40.8; avgFreeThrowsPerGame = ?33.2; overRate = ?0.54;
         tendency = "Veteran crew chief with a slight OVER lean. Known for letting stars play through contact in big games." }
    } else if (GamesLib.textContains(name, "Marc Davis") or GamesLib.textContains(name, "M. Davis")) {
      ?{ name; avgFoulsPerGame = ?38.4; avgFreeThrowsPerGame = ?30.8; overRate = ?0.49;
         tendency = "Balanced. No strong directional tendency — game flow determines the total." }
    } else if (GamesLib.textContains(name, "James Capers") or GamesLib.textContains(name, "Capers")) {
      ?{ name; avgFoulsPerGame = ?42.1; avgFreeThrowsPerGame = ?36.2; overRate = ?0.55;
         tendency = "High foul caller with a moderate OVER lean. Games managed strictly." }
    } else if (GamesLib.textContains(name, "Eric Lewis") or GamesLib.textContains(name, "E. Lewis")) {
      ?{ name; avgFoulsPerGame = ?39.5; avgFreeThrowsPerGame = ?32.4; overRate = ?0.51;
         tendency = "Balanced referee. Follows the game rather than setting a consistent tempo." }
    } else if (GamesLib.textContains(name, "Ed Malloy") or GamesLib.textContains(name, "Malloy")) {
      ?{ name; avgFoulsPerGame = ?36.2; avgFreeThrowsPerGame = ?28.9; overRate = ?0.46;
         tendency = "Low foul game. Ed Malloy allows physical play — lean UNDER, fewer free throws." }
    } else if (GamesLib.textContains(name, "Jason Phillips") or GamesLib.textContains(name, "J. Phillips")) {
      ?{ name; avgFoulsPerGame = ?37.8; avgFreeThrowsPerGame = ?31.0; overRate = ?0.48;
         tendency = "Slight UNDER lean. Lets teams play through contact, fewer stoppages." }
    } else if (GamesLib.textContains(name, "Kane Fitzgerald") or GamesLib.textContains(name, "Fitzgerald")) {
      ?{ name; avgFoulsPerGame = ?38.8; avgFreeThrowsPerGame = ?31.5; overRate = ?0.52;
         tendency = "Balanced referee. No strong trend either direction." }
    } else if (GamesLib.textContains(name, "Ben Taylor") or GamesLib.textContains(name, "B. Taylor")) {
      ?{ name; avgFoulsPerGame = ?41.0; avgFreeThrowsPerGame = ?34.5; overRate = ?0.55;
         tendency = "Moderate OVER lean. Whistles contact consistently, FT volume tends to be high." }
    } else if (GamesLib.textContains(name, "Josh Tiven") or GamesLib.textContains(name, "Tiven")) {
      ?{ name; avgFoulsPerGame = ?39.2; avgFreeThrowsPerGame = ?32.1; overRate = ?0.50;
         tendency = "Very balanced. Games called evenly with no directional edge." }
    } else if (GamesLib.textContains(name, "David Guthrie") or GamesLib.textContains(name, "Guthrie")) {
      ?{ name; avgFoulsPerGame = ?40.2; avgFreeThrowsPerGame = ?33.7; overRate = ?0.53;
         tendency = "Slightly over-friendly. Consistent whistle keeps the game flowing." }
    } else if (GamesLib.textContains(name, "Rodney Mott") or GamesLib.textContains(name, "Mott")) {
      ?{ name; avgFoulsPerGame = ?37.5; avgFreeThrowsPerGame = ?29.8; overRate = ?0.47;
         tendency = "Slight UNDER lean. Mott lets physical play go, reducing FT opportunities." }
    } else if (GamesLib.textContains(name, "Sean Wright") or GamesLib.textContains(name, "S. Wright")) {
      ?{ name; avgFoulsPerGame = ?36.8; avgFreeThrowsPerGame = ?28.5; overRate = ?0.45;
         tendency = "Low foul, low FT — strong UNDER lean. One of the tightest non-whistle refs in the league." }
    } else if (GamesLib.textContains(name, "Nick Buchert") or GamesLib.textContains(name, "Buchert")) {
      ?{ name; avgFoulsPerGame = ?40.5; avgFreeThrowsPerGame = ?33.5; overRate = ?0.53;
         tendency = "Slightly over-friendly. Consistent foul caller." }
    } else if (GamesLib.textContains(name, "Kevin Cutler") or GamesLib.textContains(name, "Cutler")) {
      ?{ name; avgFoulsPerGame = ?37.2; avgFreeThrowsPerGame = ?29.5; overRate = ?0.47;
         tendency = "Slight UNDER lean. Lets teams play through contact." }
    } else if (GamesLib.textContains(name, "Bill Kennedy") or GamesLib.textContains(name, "Kennedy")) {
      ?{ name; avgFoulsPerGame = ?39.1; avgFreeThrowsPerGame = ?31.8; overRate = ?0.51;
         tendency = "Balanced veteran. No consistent directional lean." }
    } else if (GamesLib.textContains(name, "Tom Washington") or GamesLib.textContains(name, "T. Washington")) {
      ?{ name; avgFoulsPerGame = ?38.5; avgFreeThrowsPerGame = ?31.2; overRate = ?0.50;
         tendency = "Balanced. Neutral tendency across both sides." }
    } else if (GamesLib.textContains(name, "JT Orr") or GamesLib.textContains(name, "Orr")) {
      ?{ name; avgFoulsPerGame = ?39.8; avgFreeThrowsPerGame = ?32.8; overRate = ?0.52;
         tendency = "Slightly over-friendly. Consistent foul recognition." }
    } else if (GamesLib.textContains(name, "Brandon Adair") or GamesLib.textContains(name, "Adair")) {
      ?{ name; avgFoulsPerGame = ?38.0; avgFreeThrowsPerGame = ?30.5; overRate = ?0.49;
         tendency = "Balanced. No reliable directional edge." }
    } else {
      null
    };
  };

  // Parse lead official name from ESPN game summary JSON.
  // Finds the Crew Chief from: "officials":[{"displayName":"Tony Brothers","position":{"displayName":"Crew Chief"}}]
  public func parseLeadOfficial(json : Text) : Text {
    // Find "officials" key
    if (not GamesLib.textContains(json, "\"officials\"")) return "";
    switch (GamesLib.textIndexOf(json, "\"officials\"")) {
      case null return "";
      case (?start) {
        // Get the officials array substring
        let sub = GamesLib.textSubstring(json, start, json.size());
        // Try to find crew chief first
        let crewChiefName = findCrewChief(sub);
        if (crewChiefName != "") return crewChiefName;
        // Fall back to first official
        firstOfficialName(sub);
      };
    };
  };

  func findCrewChief(s : Text) : Text {
    // Look for "Crew Chief" and extract the displayName before it in the same object
    if (not GamesLib.textContains(s, "Crew Chief")) return "";
    switch (GamesLib.textIndexOf(s, "Crew Chief")) {
      case null return "";
      case (?ccPos) {
        // Scan backwards to find the start of this official's object
        let before = GamesLib.textSubstring(s, 0, ccPos);
        // Find the last "displayName" before "Crew Chief"
        switch (GamesLib.textLastIndexOf(before, "\"displayName\":\"")) {
          case null return "";
          case (?namePos) {
            let afterKey = GamesLib.textSubstring(before, namePos + 15, before.size());
            extractUntilQuote(afterKey);
          };
        };
      };
    };
  };

  func firstOfficialName(s : Text) : Text {
    switch (GamesLib.textIndexOf(s, "\"displayName\":\"")) {
      case null return "";
      case (?pos) {
        let afterKey = GamesLib.textSubstring(s, pos + 15, s.size());
        extractUntilQuote(afterKey);
      };
    };
  };

  func extractUntilQuote(s : Text) : Text {
    let chars = s.toArray();
    var result = "";
    var i = 0;
    while (i < chars.size() and chars[i].toNat32() != 34) {
      result #= chars[i].toText();
      i += 1;
    };
    result;
  };

  public func getProfile(json : Text) : ?TotalTypes.RefereeProfile {
    let name = parseLeadOfficial(json);
    if (name == "") return null;
    switch (lookup(name)) {
      case (?p) ?p;
      case null {
        // Unknown ref — return generic profile so UI knows a ref was found
        ?{ name; avgFoulsPerGame = null; avgFreeThrowsPerGame = null; overRate = null;
           tendency = "No historical profile available for this official." }
      };
    };
  };
};
