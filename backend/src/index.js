import { CORS_HEADERS } from './config/cors.js';
import { jsonResponse, errorResponse, parseKeys } from './utils/response.js';
import { redisGet, redisSet, checkRedisHealth } from './services/redis.service.js';
import { fetchGDriveSongs } from './services/gdrive.service.js';
import { fetchYouTubeSearch, fetchYouTubeCategory } from './services/youtube.service.js';
import { fetchMetadata } from './services/metadata.service.js';
import { fetchLyrics } from './services/lyrics.service.js';
import { fetchArtistImage } from './services/artist.service.js';
import { fetchTrackFromSpotify, searchSpotify } from './services/spotify.service.js';
import { proxyStream } from './services/stream.service.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const isCacheable = request.method === 'GET' &&
      pathname !== '/api/health' &&
      pathname !== '/' &&
      pathname !== '/api/stream' &&
      url.searchParams.get('refresh') !== 'true';

    let edgeCache = null;
    try {
      if (typeof caches !== 'undefined' && caches.default) {
        edgeCache = caches.default;
      }
    } catch {}

    if (isCacheable && edgeCache) {
      try {
        const cached = await edgeCache.match(request);
        if (cached) {
          const headers = new Headers(cached.headers);
          headers.set('X-Edge-Cache', 'HIT');
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers
          });
        }
      } catch {}
    }

    const handleRoute = async () => {
      try {
        if (pathname === '/api/health' || pathname === '/') {
          const health = await checkRedisHealth(env);
          return jsonResponse({
            status: 'ok',
            service: 'SumanMusic Backend Worker',
            domain: 'api.backend.songs.sumanonline.com',
            redis: health.enabled,
            redis_connected: health.connected,
            edge_cache: true,
            timestamp: new Date().toISOString()
          });
        }

        if (pathname === '/api/gdrive/songs') {
          const folderId = env.GDRIVE_FOLDER_ID;
          const cacheKey = `gdrive_songs_${folderId || 'default'}`;
          const forceRefresh = url.searchParams.get('refresh') === 'true';

          if (!forceRefresh) {
            const cached = await redisGet(env, cacheKey);
            if (Array.isArray(cached) && cached.length > 0) {
              return jsonResponse(cached, 200, {
                'X-Cache': 'HIT-REDIS',
                'Cache-Control': 'public, max-age=3600'
              });
            }
          }

          const gdriveKeys = parseKeys(env.GDRIVE_API_KEYS);
          if (gdriveKeys.length === 0 || !folderId) {
            return errorResponse('Google Drive backend credentials missing', 500);
          }

          const songs = await fetchGDriveSongs(gdriveKeys, folderId);
          if (Array.isArray(songs) && songs.length > 0) {
            await redisSet(env, cacheKey, songs, 86400);
          }

          return jsonResponse(songs, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=3600'
          });
        }

        if (pathname === '/api/youtube/search') {
          const q = url.searchParams.get('q') || '';
          const maxResults = parseInt(url.searchParams.get('maxResults') || '20', 10);
          const cacheKey = `yt_search_${q}_${maxResults}`;

          const cached = await redisGet(env, cacheKey);
          if (cached) {
            return jsonResponse(cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=1800'
            });
          }

          const ytKeys = parseKeys(env.YOUTUBE_API_KEYS);
          if (ytKeys.length === 0) {
            return errorResponse('YouTube backend keys missing', 500);
          }

          const data = await fetchYouTubeSearch(ytKeys, q, maxResults);
          if (data && data.items && data.items.length > 0) {
            await redisSet(env, cacheKey, data, 1800);
          }
          return jsonResponse(data, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=1800'
          });
        }

        if (pathname === '/api/youtube/category') {
          const q = url.searchParams.get('q') || '';
          const maxResults = parseInt(url.searchParams.get('maxResults') || '20', 10);
          const cacheKey = `yt_cat_${q}_${maxResults}`;

          const cached = await redisGet(env, cacheKey);
          if (cached) {
            return jsonResponse(cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=3600'
            });
          }

          const ytKeys = parseKeys(env.YOUTUBE_API_KEYS);
          if (ytKeys.length === 0) {
            return errorResponse('YouTube backend keys missing', 500);
          }

          const items = await fetchYouTubeCategory(ytKeys, q, maxResults);
          if (Array.isArray(items) && items.length > 0) {
            await redisSet(env, cacheKey, items, 3600);
          }
          return jsonResponse(items, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=3600'
          });
        }

        if (pathname === '/api/metadata') {
          const artist = url.searchParams.get('artist') || '';
          const title = url.searchParams.get('title') || '';
          const provider = (url.searchParams.get('provider') || 'auto').toLowerCase();
          const fallback = url.searchParams.get('fallback') !== 'false';

          if (!artist || !title) {
            return jsonResponse(null);
          }

          const cacheKey = `meta_v4_${provider}_${fallback ? 'fb' : 'nofb'}_${artist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const cached = await redisGet(env, cacheKey);
          if (cached) {
            return jsonResponse(cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=604800'
            });
          }

          const metadata = await fetchMetadata(artist, title, env, provider, fallback);
          if (metadata) {
            await redisSet(env, cacheKey, metadata, 604800);
          }
          return jsonResponse(metadata, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=604800'
          });
        }

        if (pathname === '/api/lyrics') {
          const artist = url.searchParams.get('artist') || '';
          const title = url.searchParams.get('title') || '';
          const album = url.searchParams.get('album') || '';
          const duration = parseFloat(url.searchParams.get('duration') || '0');
          const source = (url.searchParams.get('source') || 'auto').toLowerCase();
          const forceReload = url.searchParams.get('reload') === 'true';

          const cleanA = artist.split(/\s*,\s*|\s*&\s*|\s+and\s+/i)[0].replace(/\s*(?:feat|ft)\.?.*$/i, "").trim().toLowerCase();
          const cleanT = title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').trim().toLowerCase();
          const cacheKey = `lyrics_v2_${cleanA}_${cleanT}_${source}`.replace(/[^a-z0-9]/g, '_');

          if (!forceReload) {
            const cached = await redisGet(env, cacheKey);
            if (cached) {
              return jsonResponse(cached, 200, {
                'X-Cache': 'HIT-REDIS',
                'Cache-Control': 'public, max-age=86400'
              });
            }
          }

          const lyrics = await fetchLyrics(artist, title, album, duration, source);
          if (lyrics && (lyrics.lines?.length > 0 || lyrics.plainLyrics)) {
            await redisSet(env, cacheKey, lyrics, 604800);
          }
          return jsonResponse(lyrics, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=86400'
          });
        }

        if (pathname === '/api/translate') {
          let lines = [];
          let mode = 'translation';
          if (request.method === 'POST') {
            try {
              const body = await request.json();
              lines = Array.isArray(body.lines) ? body.lines : [];
              if (body.mode) mode = body.mode;
            } catch {}
          } else {
            const q = url.searchParams.get('q');
            if (q) lines = [q];
          }

          const target = url.searchParams.get('target') || 'en';
          if (!lines || lines.length === 0) {
            return jsonResponse({ translations: [], romanized: [] }, 200);
          }

          const validItems = [];
          for (let i = 0; i < lines.length; i++) {
            const text = (typeof lines[i] === 'string' ? lines[i] : lines[i]?.text || '').trim();
            if (text && !lines[i]?.isCountdown) {
              validItems.push({ originalIndex: i, text });
            }
          }

          if (validItems.length === 0) {
            return jsonResponse({ translations: new Array(lines.length).fill(''), romanized: new Array(lines.length).fill('') }, 200);
          }

          const joinedSignature = validItems.map(item => item.text).join('|');
          const hash = Array.from(joinedSignature.slice(0, 100)).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
          const cacheKey = `trans_v2_${target}_${hash}_${validItems.length}`;

          const cached = await redisGet(env, cacheKey);
          if (cached && typeof cached === 'object' && Array.isArray(cached.translations)) {
            return jsonResponse(cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=604800'
            });
          }

          const chunkArray = (arr, size) => {
            const res = [];
            for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
            return res;
          };

          const chunks = chunkArray(validItems, 25);
          const translationsMap = {};
          const romanizedMap = {};
          let detectedSourceLang = null;

          for (const chunk of chunks) {
            const numberedText = chunk.map((item, idx) => `${idx}___ ${item.text}`).join('\n');
            const clients = ['dict-chrome-ex', 'at'];
            let chunkSuccess = false;

            for (const clientName of clients) {
              try {
                const gUrl = `https://translate.googleapis.com/translate_a/single?client=${clientName}&sl=auto&tl=${encodeURIComponent(target)}&dt=t&dt=rm`;
                const gRes = await fetch(gUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  },
                  body: `q=${encodeURIComponent(numberedText)}`
                });

                if (gRes.ok) {
                  const gData = await gRes.json();
                  if (gData && Array.isArray(gData[0])) {
                    if (gData[2]) detectedSourceLang = gData[2];
                    const fullTrans = gData[0].map(x => x[0]).filter(Boolean).join('');
                    const fullRoman = gData[0].map(x => x[3]).filter(Boolean).join('');

                    const transLines = fullTrans.split('\n');
                    for (const tLine of transLines) {
                      const match = tLine.match(/^\s*(\d+)___\s*(.*)$/);
                      if (match) {
                        const localIdx = parseInt(match[1], 10);
                        if (chunk[localIdx]) {
                          translationsMap[chunk[localIdx].originalIndex] = match[2].trim();
                        }
                      }
                    }

                    const romanLines = fullRoman.split('\n');
                    for (const rLine of romanLines) {
                      const match = rLine.match(/^\s*(\d+)___\s*(.*)$/);
                      if (match) {
                        const localIdx = parseInt(match[1], 10);
                        if (chunk[localIdx]) {
                          romanizedMap[chunk[localIdx].originalIndex] = match[2].trim();
                        }
                      }
                    }

                    chunk.forEach((item, localIdx) => {
                      if (!translationsMap[item.originalIndex] && transLines[localIdx]) {
                        translationsMap[item.originalIndex] = transLines[localIdx].replace(/^\s*\d+___\s*/, '').trim();
                      }
                      if (!romanizedMap[item.originalIndex] && romanLines[localIdx]) {
                        romanizedMap[item.originalIndex] = romanLines[localIdx].replace(/^\s*\d+___\s*/, '').trim();
                      }
                    });

                    chunkSuccess = true;
                    break;
                  }
                }
              } catch {}
            }

            if (!chunkSuccess) {
              try {
                for (const item of chunk) {
                  const sUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(target)}&dt=t&dt=rm&q=${encodeURIComponent(item.text)}`;
                  const sRes = await fetch(sUrl);
                  if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData?.[0]?.[0]?.[0]) {
                      translationsMap[item.originalIndex] = sData[0][0][0].trim();
                    }
                    if (sData?.[0]?.[1]?.[3]) {
                      romanizedMap[item.originalIndex] = sData[0][1][3].trim();
                    }
                    if (sData?.[2]) detectedSourceLang = sData[2];
                  }
                }
              } catch {}
            }
          }

          const finalTranslations = new Array(lines.length).fill('');
          const finalRomanized = new Array(lines.length).fill('');

          for (let i = 0; i < lines.length; i++) {
            finalTranslations[i] = translationsMap[i] || '';
            finalRomanized[i] = romanizedMap[i] || '';
          }

          const payload = {
            translations: finalTranslations,
            romanized: finalRomanized,
            detectedLang: detectedSourceLang || 'auto'
          };

          if (Object.keys(translationsMap).length > 0) {
            await redisSet(env, cacheKey, payload, 604800);
          }

          return jsonResponse(payload, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=604800'
          });
        }

        if (pathname === '/api/artist-image') {
          const artist = url.searchParams.get('artist') || '';
          const provider = (url.searchParams.get('provider') || 'auto').toLowerCase();
          const fallback = url.searchParams.get('fallback') !== 'false';
          if (!artist) {
            return jsonResponse({ imageUrl: null });
          }

          const cacheKey = `artist_img_v4_${provider}_${fallback ? 'fb' : 'nofb'}_${artist.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const cached = await redisGet(env, cacheKey);
          if (cached) {
            return jsonResponse({ imageUrl: cached === '__not_found__' ? null : cached }, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=86400'
            });
          }

          const foundImage = await fetchArtistImage(artist, env, provider, fallback);
          if (foundImage) {
            await redisSet(env, cacheKey, foundImage, 1209600);
          } else {
            await redisSet(env, cacheKey, '__not_found__', 259200);
          }

          return jsonResponse({ imageUrl: foundImage }, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=86400'
          });
        }

        if (pathname === '/api/metadata') {
          const artist = url.searchParams.get('artist') || '';
          const title = url.searchParams.get('title') || '';
          const provider = (url.searchParams.get('provider') || 'auto').toLowerCase();
          const fallback = url.searchParams.get('fallback') !== 'false';
          if (!title) {
            return jsonResponse(null, 200);
          }

          const cacheKey = `meta_v2_${provider}_${fallback ? 'fb' : 'nofb'}_${(artist + '_' + title).toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const cached = await redisGet(env, cacheKey);
          if (cached) {
            return jsonResponse(cached === '__not_found__' ? null : cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=604800'
            });
          }

          const meta = await fetchMetadata(artist, title, env, provider, fallback);
          if (meta) {
            await redisSet(env, cacheKey, meta, 1209600);
          } else {
            await redisSet(env, cacheKey, '__not_found__', 259200);
          }

          return jsonResponse(meta, 200, {
            'X-Cache': 'MISS',
            'Cache-Control': 'public, max-age=604800'
          });
        }

        if (pathname === '/api/spotify/metadata') {
          const artist = url.searchParams.get('artist') || '';
          const title = url.searchParams.get('title') || '';
          if (!title) {
            return errorResponse('Title parameter is required', 400);
          }
          const track = await fetchTrackFromSpotify(artist, title, env);
          return jsonResponse({ track }, 200);
        }

        if (pathname === '/api/spotify/search') {
          const q = url.searchParams.get('q') || '';
          const type = url.searchParams.get('type') || 'track';
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
          if (!q) {
            return errorResponse('Query parameter q is required', 400);
          }
          const results = await searchSpotify(q, type, limit, env);
          return jsonResponse(results, 200);
        }

        if (pathname === '/api/stream') {
          return await proxyStream(request, env, url);
        }

        return errorResponse('Endpoint not found', 404);
      } catch (err) {
        console.error('Worker error:', err);
        return errorResponse(err.message || 'Internal server error', 500);
      }
    };

    const response = await handleRoute();
    if (isCacheable && edgeCache && response.status === 200 && ctx && ctx.waitUntil) {
      try {
        ctx.waitUntil(edgeCache.put(request, response.clone()));
      } catch {}
    }

    return response;
  }
};
