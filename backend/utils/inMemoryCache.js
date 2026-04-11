const globalCache = global.__vidyarthiMitraCache || {
  values: new Map(),
  pending: new Map(),
};

global.__vidyarthiMitraCache = globalCache;

const cloneValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const getCachedValue = (key) => {
  const entry = globalCache.values.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    globalCache.values.delete(key);
    return undefined;
  }

  return cloneValue(entry.value);
};

const setCachedValue = (key, value, ttlMs) => {
  const ttl = Math.max(0, Number(ttlMs || 0));

  globalCache.values.set(key, {
    value: cloneValue(value),
    expiresAt: Date.now() + ttl,
  });

  return cloneValue(value);
};

const getOrSetCachedValue = async (key, ttlMs, loader) => {
  const cachedValue = getCachedValue(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  if (globalCache.pending.has(key)) {
    return cloneValue(await globalCache.pending.get(key));
  }

  const pendingPromise = Promise.resolve()
    .then(loader)
    .then((value) => {
      setCachedValue(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      globalCache.pending.delete(key);
    });

  globalCache.pending.set(key, pendingPromise);

  return cloneValue(await pendingPromise);
};

const clearCachedValuesByPrefix = (prefix) => {
  for (const key of globalCache.values.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.values.delete(key);
    }
  }

  for (const key of globalCache.pending.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.pending.delete(key);
    }
  }
};

module.exports = {
  getCachedValue,
  setCachedValue,
  getOrSetCachedValue,
  clearCachedValuesByPrefix,
};
