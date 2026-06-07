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
  let OPENAI_API_KEY : Text = "sk-proj-_yo4c47vn35_GYTcFVRSL2Rb23cfC9ntzsYA_5c503Rvin_fDEWjpecW" #
    "ayh4darRtl4HnP8snzT3BlbkFJNZzpznuPeErrTqfRhQNZSjLu8sT0STntb1nHFWH3fkQW8KzyIl42SLekfrrakN4TKCZeCcqMUA";

  // Shared response cache — 15-minute TTL, persists across upgrades.
  let apiCache : CacheLib.Cache = CacheLib.empty();

  include GamesApi(BDL_API_KEY, ODDS_API_KEY, apiCache);
  include PropsApi(BDL_API_KEY, OPENAI_API_KEY, transform, apiCache);
  include TotalsApi(BDL_API_KEY, OPENAI_API_KEY, transform, apiCache);
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

