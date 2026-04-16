const { createClient } = require("redis");
const { getCachedValue, setCachedValue } = require("./inMemoryCache");

const REDIS_PREFIX = "dyn:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 3;

let client = null;
let connectPromise = null;
let warned = false;

const getClient = async () => {
  if (client?.isOpen) {
    return client;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warned) {
      warned = true;
      console.warn("REDIS_URL is not configured; dynamic test sessions are using in-memory fallback.");
    }
    return null;
  }

  if (!client) {
    client = createClient({ url });
    client.on("error", (error) => {
      console.error("Redis client error:", error.message);
    });
  }

  if (!client.isOpen) {
    if (!connectPromise) {
      connectPromise = client.connect().finally(() => {
        connectPromise = null;
      });
    }
    try {
      await connectPromise;
    } catch (error) {
      if (!warned) {
        warned = true;
        console.warn("Redis unavailable; dynamic test sessions are using in-memory fallback.");
      }
      return null;
    }
  }

  return client.isOpen ? client : null;
};

const makeKey = (key) => `${REDIS_PREFIX}${key}`;

const setSession = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = await getClient();
  const namespacedKey = makeKey(key);
  const payload = JSON.stringify(value);

  if (!redis) {
    setCachedValue(namespacedKey, value, Number(ttlSeconds || DEFAULT_TTL_SECONDS) * 1000);
    return;
  }

  await redis.set(namespacedKey, payload, { EX: Number(ttlSeconds || DEFAULT_TTL_SECONDS) });
};

const getSession = async (key) => {
  const redis = await getClient();
  const namespacedKey = makeKey(key);

  if (!redis) {
    return getCachedValue(namespacedKey) || null;
  }

  const value = await redis.get(namespacedKey);
  return value ? JSON.parse(value) : null;
};

const deleteSession = async (key) => {
  const redis = await getClient();
  const namespacedKey = makeKey(key);

  if (!redis) {
    setCachedValue(namespacedKey, null, 1);
    return;
  }

  await redis.del(namespacedKey);
};

module.exports = {
  setSession,
  getSession,
  deleteSession,
};
