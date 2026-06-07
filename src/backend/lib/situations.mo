import GameTypes "../types/games";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  // Evaluate situational angles for a game.
  // All angles are rule-based, requiring only odds + rest data already fetched.
  public func detectAngles(
    homeTeamName : Text,
    awayTeamName : Text,
    homeRestDays : Nat,
    awayRestDays : Nat,
    odds : [GameTypes.OddsLine],
  ) : [GameTypes.SituationalAngle] {
    var angles : [GameTypes.SituationalAngle] = [];

    let (homeSpread, overUnder) = consensusLine(odds);

    // 1. Home Underdog — covers at ~54% historically
    if (homeSpread > 0.5) {
      angles := append(angles, {
        name = "Home Underdog";
        description = homeTeamName # " is a home underdog (" # formatSpread(homeSpread) # "). Home dogs cover ATS at 54%.";
        edge = "LEAN " # homeTeamName # " +ATS";
        confidence = 54;
      });
    };

    // 2. Fade Large Spread — big favorites (10+) cover at under 45%
    let absSpread = if (homeSpread < 0.0) (-homeSpread) else homeSpread;
    if (absSpread >= 10.0) {
      let favName = if (homeSpread < 0.0) homeTeamName else awayTeamName;
      let dogName = if (homeSpread < 0.0) awayTeamName else homeTeamName;
      angles := append(angles, {
        name = "Large Spread — Fade the Chalk";
        description = favName # " favored by " # floatToText1(absSpread) # "+ pts. Double-digit favorites cover under 45% of the time.";
        edge = "LEAN " # dogName # " +ATS";
        confidence = 56;
      });
    };

    // 3. Away B2B — road team on zero rest is 44% ATS and under-prone
    if (awayRestDays == 0) {
      angles := append(angles, {
        name = "Away Team Back-to-Back";
        description = awayTeamName # " plays on zero days rest (road B2B). Road B2B teams are 44% ATS and fuel UNDER.";
        edge = "FADE " # awayTeamName # " — lean home ATS and UNDER";
        confidence = 60;
      });
    };

    // 4. Home B2B
    if (homeRestDays == 0) {
      angles := append(angles, {
        name = "Home Team Back-to-Back";
        description = homeTeamName # " plays on zero rest. Home B2B teams are 46% ATS.";
        edge = "LEAN " # awayTeamName # " +ATS";
        confidence = 54;
      });
    };

    // 5. Large rest differential
    if (homeRestDays >= 3 and awayRestDays <= 1) {
      angles := append(angles, {
        name = "Home Rest Advantage";
        description = homeTeamName # " rested " # Nat.toText(homeRestDays) # " days vs " # awayTeamName # "'s " # Nat.toText(awayRestDays) # ". Rested home teams cover at 57%.";
        edge = "LEAN " # homeTeamName # " -ATS";
        confidence = 57;
      });
    } else if (awayRestDays >= 3 and homeRestDays <= 1) {
      angles := append(angles, {
        name = "Away Rest Advantage";
        description = awayTeamName # " rested " # Nat.toText(awayRestDays) # " days vs " # homeTeamName # "'s " # Nat.toText(homeRestDays) # ". Away teams with 3+ day rest edges cover at 55%.";
        edge = "LEAN " # awayTeamName # " +ATS";
        confidence = 55;
      });
    };

    // 6. Both teams well rested — higher-scoring games
    if (homeRestDays >= 3 and awayRestDays >= 3) {
      angles := append(angles, {
        name = "Both Teams Well Rested";
        description = "Both teams have 3+ days rest. Well-rested matchups produce higher scoring — OVER at 55%.";
        edge = "LEAN OVER " # floatToText1(overUnder);
        confidence = 55;
      });
    };

    // 7. Low-total environment — under-lean
    if (overUnder > 0.0 and overUnder < 210.0) {
      angles := append(angles, {
        name = "Low-Total Environment";
        description = "Implied total of " # floatToText1(overUnder) # " signals two elite defenses. Sub-210 games go UNDER 56% of the time.";
        edge = "LEAN UNDER " # floatToText1(overUnder);
        confidence = 56;
      });
    };

    // 8. Very high total — books typically shade these aggressively toward over
    if (overUnder >= 235.0) {
      angles := append(angles, {
        name = "High-Total Caution";
        description = "Total of " # floatToText1(overUnder) # " is inflated — books shade high-total games expecting public OVER action. These go UNDER 53%.";
        edge = "SLIGHT LEAN UNDER " # floatToText1(overUnder);
        confidence = 53;
      });
    };

    angles;
  };

  // Build a RestAdvantage record from computed rest days
  public func buildRestAdvantage(
    homeTeamName : Text,
    awayTeamName : Text,
    homeRestDays : Nat,
    awayRestDays : Nat,
  ) : GameTypes.RestAdvantage {
    let advantage = if (homeRestDays > awayRestDays) "HOME"
                    else if (awayRestDays > homeRestDays) "AWAY"
                    else "NONE";
    let diff = if (homeRestDays > awayRestDays) homeRestDays - awayRestDays
               else awayRestDays - homeRestDays;
    let impact = if (homeRestDays == 0 and awayRestDays == 0) {
      "Both teams back-to-back. Fatigue is a wash but expect lower scoring."
    } else if (homeRestDays == 0) {
      homeTeamName # " is on a back-to-back. Fatigue advantage to " # awayTeamName # "."
    } else if (awayRestDays == 0) {
      awayTeamName # " is on a back-to-back. Significant rest edge to " # homeTeamName # "."
    } else if (diff == 0) {
      "Equal rest — no rest edge between teams."
    } else if (diff >= 3) {
      let advTeam = if (advantage == "HOME") homeTeamName else awayTeamName;
      advTeam # " has a " # Nat.toText(diff) # "-day rest edge — strong situational ATS angle."
    } else if (diff >= 2) {
      let advTeam = if (advantage == "HOME") homeTeamName else awayTeamName;
      advTeam # " has a " # Nat.toText(diff) # "-day rest advantage — moderate ATS lean."
    } else {
      "1-day rest differential — limited betting impact."
    };
    { homeRestDays; awayRestDays; advantage; impactDescription = impact };
  };

  // ── Private helpers ───────────────────────────────────────────────────────────

  func consensusLine(odds : [GameTypes.OddsLine]) : (Float, Float) {
    if (odds.size() == 0) return (0.0, 0.0);
    var spreadSum = 0.0;
    var totalSum = 0.0;
    var spreadCount = 0;
    var totalCount = 0;
    for (line in odds.vals()) {
      switch (line.homeSpread) {
        case (?s) { spreadSum += s; spreadCount += 1 };
        case null {};
      };
      switch (line.overUnder) {
        case (?t) { totalSum += t; totalCount += 1 };
        case null {};
      };
    };
    let spread = if (spreadCount > 0) spreadSum / floatOfNat(spreadCount) else 0.0;
    let total = if (totalCount > 0) totalSum / floatOfNat(totalCount) else 0.0;
    (spread, total);
  };

  func append(arr : [GameTypes.SituationalAngle], item : GameTypes.SituationalAngle) : [GameTypes.SituationalAngle] {
    Array.tabulate<GameTypes.SituationalAngle>(arr.size() + 1, func(i) {
      if (i < arr.size()) arr[i] else item
    });
  };

  func formatSpread(s : Float) : Text {
    if (s > 0.0) "+" # floatToText1(s) else floatToText1(s);
  };

  func floatToText1(f : Float) : Text {
    let sign = if (f < 0.0) "-" else "";
    let abs = if (f < 0.0) -f else f;
    let whole = floatToNat(abs);
    let frac = floatToNat((abs - floatOfNat(whole)) * 10.0);
    sign # Nat.toText(whole) # "." # Nat.toText(frac);
  };

  func floatOfNat(n : Nat) : Float {
    var acc = 0.0;
    var i = 0;
    while (i < n) { acc += 1.0; i += 1 };
    acc;
  };

  func floatToNat(f : Float) : Nat {
    var n = 0;
    var acc = 0.0;
    while (acc + 1.0 <= f) { acc += 1.0; n += 1 };
    n;
  };
};
