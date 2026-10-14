import { ENV } from '../config/env';
import { getCachedTrackMetadata, setCachedTrackMetadata, cleanupExpiredMetadata } from '../lib/indexedDbStorage';

const memoryCache = new Map();

class RedisClient {
  constructor() {
    this.backendUrl = (ENV.BACKEND_URL || '').trim().replace(/\/+$/, '');
    this.isEnabled = Boolean(this.backendUrl);
  }

  async get(key) {
    if (!this.isEnabled || !key) return null;
    try {
      const res = await fetch(`${this.backendUrl}/api/cache?key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    } catch {
      return null;
    }
  }

  async set(key, data, ttlSeconds = 86400) {
    if (!this.isEnabled || !key || data === undefined) return false;
    try {
      const res = await fetch(`${this.backendUrl}/api/cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, ttl: ttlSeconds }),
        signal: AbortSignal.timeout(4000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async del(_key) {
    return false;
  }
}

export const redis = new RedisClient();

export const redisGet = async (key) => {
  if (!key) return null;

  if (memoryCache.has(key)) {
    const item = memoryCache.get(key);
    if (!item.expiry || Date.now() < item.expiry) {
      return item.data;
    }
    memoryCache.delete(key);
  }

  try {
    const idbData = await getCachedTrackMetadata(key);
    if (idbData !== null && idbData !== undefined) {
      memoryCache.set(key, { data: idbData, expiry: Date.now() + 60 * 60 * 1000 });
      return idbData;
    }
  } catch (_) {}

  if (redis.isEnabled) {
    try {
      const remoteData = await redis.get(key);
      if (remoteData !== null && remoteData !== undefined) {
        memoryCache.set(key, { data: remoteData, expiry: Date.now() + 60 * 60 * 1000 });
        setCachedTrackMetadata(key, remoteData, 60 * 60 * 1000).catch(() => {});
        return remoteData;
      }
    } catch (_) {}
  }

  return null;
};

export const redisSet = async (key, data, ttlSeconds = 86400) => {
  if (!key || data === undefined) return;

  const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  const payload = { data, expiry };

  memoryCache.set(key, payload);

  const ttlMs = ttlSeconds ? ttlSeconds * 1000 : 7 * 24 * 60 * 60 * 1000;
  setCachedTrackMetadata(key, data, ttlMs).catch(() => {});

  if (redis.isEnabled) {
    redis.set(key, data, ttlSeconds).catch(() => {});
  }
};

export const redisDel = async (key) => {
  if (!key) return;
  memoryCache.delete(key);
  cleanupExpiredMetadata(key).catch(() => {});
};
