import GamesApi "mixins/games-api";
import PropsApi "mixins/props-api";
import TotalsApi "mixins/totals-api";
import OpenAIApi "mixins/openai-api";
import HistoryApi "mixins/history-api";
import CommonTypes "types/common";
import CacheLib "lib/cache";



actor {
  // API keys are hardcoded — single-user app, no Settings UI needed.
  let BDL_API_KEY : Text = "866f00d3-c11f-4b46-bf67-6e37accde2b9";
  let ODDS_API_KEY : Text = "6f6725d8b12b239c51bd1b404fd83c5e";
  let CLAUDE_API_KEY : Text = "sk-ant-api03-Gl3Sm6YSSPJLULNCimU__x8de8pCSoJxLCgHBMi3Ii_SjYf4qdK7WRZ" #
    "-OR-i2LFElg_ol1xkOjTvKHTMRXrj-A-ohK0IQAA";

  // Shared response cache — 15-minute TTL, persists across upgrades.
  let apiCache : CacheLib.Cache = CacheLib.empty();

  include GamesApi(BDL_API_KEY, ODDS_API_KEY, apiCache);
  include PropsApi(BDL_API_KEY, CLAUDE_API_KEY, transform, apiCache);
  include TotalsApi(BDL_API_KEY, CLAUDE_API_KEY, transform, apiCache);
  include OpenAIApi();
  include HistoryApi();

  public query func getApiStatus() : async CommonTypes.ApiStatus {
    {
      oddsApiConfigured = true;
      openAiConfigured = true;
      bdlApiConfigured = true;
      lastOddsApiCallStatus = null;
      lastBdlCallStatus = null;
    };
  };
};

