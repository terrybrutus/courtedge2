import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";

module {
  public type CacheEntry = {
    value : Text;
    storedAt : Int; // Time.now() nanoseconds
  };

  public type Cache = Map.Map<Text, CacheEntry>;

  // 15 minutes in nanoseconds
  public let TTL_NS : Int = 900_000_000_000;

  public func empty() : Cache {
    Map.empty<Text, CacheEntry>();
  };

  // Returns cached value if present and not expired. Also removes expired entry.
  public func get(cache : Cache, key : Text) : ?Text {
    switch (cache.get(key)) {
      case null null;
      case (?entry) {
        let age = Time.now() - entry.storedAt;
        if (age < TTL_NS) {
          ?entry.value;
        } else {
          // Expired — remove it
          cache.remove(key);
          null;
        };
      };
    };
  };

  public func put(cache : Cache, key : Text, value : Text) {
    cache.add(key, { value; storedAt = Time.now() });
  };
};
