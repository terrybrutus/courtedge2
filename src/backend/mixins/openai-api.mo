// API keys are now hardcoded constants — no dynamic configuration needed.
// Setter stubs are kept so the frontend compiles without changes.
mixin () {
  // Keys are always configured (hardcoded in main.mo).
  public query func isOpenAIConfigured() : async Bool { true };
  public query func isOddsApiConfigured() : async Bool { true };
  public query func isBdlApiConfigured() : async Bool { true };

  // No-op stubs — frontend may still call these but they do nothing.
  public shared func setOpenAIApiKey(_key : Text) : async () { () };
  public shared func setOddsApiKey(_key : Text) : async () { () };
  public shared func setBdlApiKey(_key : Text) : async () { () };
};
