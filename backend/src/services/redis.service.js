export const redisGet = async (env, key) => {
  const url = env.REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.result === null || json.result === undefined) return null;
    if (typeof json.result === 'string') {
      try { return JSON.parse(json.result); } catch { return json.result; }
    }
    return json.result;
  } catch {
    return null;
  }
};

export const redisSet = async (env, key, value, ttlSeconds = 86400) => {
  const url = env.REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const res = await fetch(`${url.replace(/\/+$/, '')}/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: serialized
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const checkRedisHealth = async (env) => {
  const url = env.REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { enabled: false, connected: false, writable: false };
  }
  try {
    const pingRes = await fetch(`${url.replace(/\/+$/, '')}/ping`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const connected = pingRes.ok;
    return {
      enabled: true,
      connected
    };
  } catch {
    return { enabled: true, connected: false };
  }
};
