import { ENV } from '../config/env';

const memoryCache = new Map();
const LOCAL_STORAGE_PREFIX = 'sm_cache_';

class RedisClient {
  constructor() {
    this.url = (ENV.REDIS?.REST_URL || '').trim().replace(/\/+$/, '');
    this.token = (ENV.REDIS?.REST_TOKEN || '').trim();
    this.isReadEnabled = Boolean(this.url && this.token);
    this.isWriteEnabled = Boolean(this.url && this.token);
  }

  async fetch(path, options = {}) {
    if (!this.isReadEnabled) return null;
    try {
      const response = await fetch(`${this.url}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      if (response.status === 403) {
        this.isWriteEnabled = false;
        return null;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async get(key) {
    if (!this.isReadEnabled) return null;
    const res = await this.fetch(`/get/${encodeURIComponent(key)}`);
    if (!res || res.result === null || res.result === undefined) return null;
    
    if (typeof res.result === 'string') {
      try {
        return JSON.parse(res.result);
      } catch {
        return res.result;
      }
    }
    return res.result;
  }

  async set(key, value, ttlSeconds = null) {
    if (!this.isWriteEnabled) return false;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const path = ttlSeconds
      ? `/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`
      : `/set/${encodeURIComponent(key)}`;
    
    const res = await this.fetch(path, {
      method: 'POST',
      body: serialized
    });
    return res?.result === 'OK';
  }

  async del(key) {
    if (!this.isWriteEnabled) return false;
    const res = await this.fetch(`/del/${encodeURIComponent(key)}`, {
      method: 'POST'
    });
    return res?.result > 0;
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
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.expiry || Date.now() < parsed.expiry) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    }
  } catch (_) {
  }

  if (redis.isReadEnabled) {
    try {
      const remoteData = await redis.get(key);
      if (remoteData !== null && remoteData !== undefined) {
        memoryCache.set(key, { data: remoteData, expiry: Date.now() + 60 * 60 * 1000 });
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_PREFIX}${key}`,
            JSON.stringify({ data: remoteData, expiry: Date.now() + 60 * 60 * 1000 })
          );
        } catch (_) { }
        return remoteData;
      }
    } catch (_) {
    }
  }

  return null;
};

export const redisSet = async (key, data, ttlSeconds = 86400) => {
  if (!key || data === undefined) return;

  const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  const payload = { data, expiry };

  memoryCache.set(key, payload);

  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(payload));
  } catch (_) {
    try {
      const keysToClean = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_PREFIX));
      keysToClean.slice(0, 20).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(payload));
    } catch (_) { }
  }

  if (redis.isWriteEnabled) {
    redis.set(key, data, ttlSeconds).catch(() => {});
  }
};

export const redisDel = async (key) => {
  if (!key) return;
  memoryCache.delete(key);
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
  } catch (_) { }

  if (redis.isWriteEnabled) {
    await redis.del(key).catch(() => {});
  }
};
