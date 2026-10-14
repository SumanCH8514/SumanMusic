import { CORS_HEADERS } from './config/cors.js';
import { jsonResponse, errorResponse, parseKeys } from './utils/response.js';
import { redisGet, redisSet, checkRedisHealth } from './services/redis.service.js';
import { fetchGDriveSongs } from './services/gdrive.service.js';
import { fetchYouTubeSearch, fetchYouTubeCategory } from './services/youtube.service.js';
import { fetchMetadata } from './services/metadata.service.js';
import { fetchLyrics } from './services/lyrics.service.js';
import { fetchArtistImage } from './services/artist.service.js';
import { fetchTrackFromSpotify, searchSpotify } from './services/spotify.service.js';
import { searchYouTubeIMusic, getYouTubeIAudioUrl } from './services/youtubei.service.js';

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
      pathname !== '/api/youtube/stream' &&
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
        if (pathname === '/api/health' || pathname === '/' || pathname === '/health' || pathname === '/api') {
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

        if (pathname === '/api/catalog/status' || pathname === '/api/status') {
          const folderId = env.GDRIVE_FOLDER_ID;
          const cacheKey = `gdrive_songs_${folderId || 'default'}`;
          const versionKey = `gdrive_songs_ver_${folderId || 'default'}`;

          const version = await redisGet(env, versionKey);
          const cached = await redisGet(env, cacheKey);
          const count = Array.isArray(cached) ? cached.length : 0;

          return jsonResponse({
            status: 'ok',
            version: version || (count > 0 ? `v_${count}` : 'none'),
            count,
            available: count > 0,
            timestamp: new Date().toISOString()
          }, 200, {
            'Cache-Control': 'no-cache, must-revalidate'
          });
        }

        if ((pathname === '/api/catalog/sync' || pathname === '/api/sync') && (request.method === 'POST' || request.method === 'GET')) {
          const folderId = env.GDRIVE_FOLDER_ID;
          const cacheKey = `gdrive_songs_${folderId || 'default'}`;
          const versionKey = `gdrive_songs_ver_${folderId || 'default'}`;

          const gdriveKeys = parseKeys(env.GDRIVE_API_KEYS);
          if (gdriveKeys.length === 0 || !folderId) {
            return errorResponse('Google Drive backend credentials missing', 500);
          }

          const songs = await fetchGDriveSongs(gdriveKeys, folderId);
          const now = Date.now();
          const newVersion = `v_${now}_${songs.length}`;

          if (Array.isArray(songs) && songs.length > 0) {
            await redisSet(env, cacheKey, songs, 86400);
            await redisSet(env, versionKey, newVersion, 86400);
          }

          return jsonResponse({
            status: 'ok',
            version: newVersion,
            count: songs.length,
            songs
          }, 200, {
            'X-Cache': 'REFRESHED',
            'ETag': `"${newVersion}"`,
            'Cache-Control': 'public, max-age=3600'
          });
        }

        if (pathname === '/api/gdrive/songs' || pathname === '/api/songs' || pathname === '/songs') {
          const folderId = env.GDRIVE_FOLDER_ID;
          const cacheKey = `gdrive_songs_${folderId || 'default'}`;
          const versionKey = `gdrive_songs_ver_${folderId || 'default'}`;
          const forceRefresh = url.searchParams.get('refresh') === 'true';

          let version = await redisGet(env, versionKey);

          if (!forceRefresh) {
            const cached = await redisGet(env, cacheKey);
            if (Array.isArray(cached) && cached.length > 0) {
              const currentVersion = version || `v_${cached.length}`;
              const clientVersion = url.searchParams.get('v');
              const ifNoneMatch = request.headers.get('if-none-match');
              if (
                (ifNoneMatch && (ifNoneMatch === `"${currentVersion}"` || ifNoneMatch === currentVersion)) ||
                (clientVersion && clientVersion === currentVersion)
              ) {
                return new Response(null, {
                  status: 304,
                  headers: {
                    ...CORS_HEADERS,
                    'ETag': `"${currentVersion}"`,
                    'X-Catalog-Version': currentVersion,
                    'Cache-Control': 'public, max-age=3600'
                  }
                });
              }

              return jsonResponse(cached, 200, {
                'X-Cache': 'HIT-REDIS',
                'ETag': `"${currentVersion}"`,
                'X-Catalog-Version': currentVersion,
                'Cache-Control': 'public, max-age=3600'
              });
            }
          }

          const gdriveKeys = parseKeys(env.GDRIVE_API_KEYS);
          if (gdriveKeys.length === 0 || !folderId) {
            return errorResponse('Google Drive backend credentials missing', 500);
          }

          const songs = await fetchGDriveSongs(gdriveKeys, folderId);
          const now = Date.now();
          const newVersion = `v_${now}_${songs.length}`;

          if (Array.isArray(songs) && songs.length > 0) {
            await redisSet(env, cacheKey, songs, 86400);
            await redisSet(env, versionKey, newVersion, 86400);
          }

          return jsonResponse(songs, 200, {
            'X-Cache': forceRefresh ? 'REFRESHED' : 'MISS',
            'ETag': `"${newVersion}"`,
            'X-Catalog-Version': newVersion,
            'Cache-Control': 'public, max-age=3600'
          });
        }

        if (pathname === '/api/youtube/stream') {
          const videoId = url.searchParams.get('videoId') || url.searchParams.get('v') || '';
          if (!videoId) {
            return errorResponse('videoId is required', 400);
          }

          const cleanVideoId = String(videoId).replace(/^yt_/, '');
          const streamCacheKey = `yt_audio_url_v2_${cleanVideoId}`;

          let streamData = null;

          const cached = await redisGet(env, streamCacheKey);
          if (cached && cached.url) {
            try {
              const probe = await fetch(cached.url, {
                method: 'HEAD',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
              });
              if (probe.ok || probe.status === 206) {
                streamData = cached;
              }
            } catch {}
          }

          if (!streamData) {
            streamData = await Promise.race([
              getYouTubeIAudioUrl(cleanVideoId),
              new Promise(resolve => setTimeout(() => resolve(null), 8000))
            ]);

            if (streamData && streamData.url) {
              await redisSet(env, streamCacheKey, streamData, 7200);
            }
          }

          if (streamData && streamData.url) {
            const clientRange = request.headers.get('range') || request.headers.get('Range');
            const upstreamHeaders = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            };
            if (clientRange) {
              upstreamHeaders['Range'] = clientRange;
            }

            const audioRes = await fetch(streamData.url, {
              headers: upstreamHeaders
            });

            if (!audioRes.ok && audioRes.status !== 206) {
              await redisSet(env, streamCacheKey, null, 1);

              const freshData = await Promise.race([
                getYouTubeIAudioUrl(cleanVideoId),
                new Promise(resolve => setTimeout(() => resolve(null), 6000))
              ]);

              if (freshData && freshData.url) {
                await redisSet(env, streamCacheKey, freshData, 7200);
                const retryRes = await fetch(freshData.url, { headers: upstreamHeaders });
                if (retryRes.ok || retryRes.status === 206) {
                  const resHeaders = new Headers(CORS_HEADERS);
                  resHeaders.set('Content-Type', freshData.mimeType || 'audio/mp4');
                  resHeaders.set('Accept-Ranges', 'bytes');
                  resHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                  resHeaders.set('X-Stream-Client', freshData.client || 'unknown');
                  const contentRange = retryRes.headers.get('content-range');
                  if (contentRange) resHeaders.set('Content-Range', contentRange);
                  const contentLength = retryRes.headers.get('content-length');
                  if (contentLength) resHeaders.set('Content-Length', contentLength);
                  return new Response(retryRes.body, { status: retryRes.status, headers: resHeaders });
                }
              }

              return errorResponse('Audio stream expired and refresh failed', 410);
            }

            const resHeaders = new Headers(CORS_HEADERS);
            resHeaders.set('Content-Type', streamData.mimeType || 'audio/mp4');
            resHeaders.set('Accept-Ranges', 'bytes');
            resHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            resHeaders.set('X-Stream-Client', streamData.client || 'unknown');

            const contentRange = audioRes.headers.get('content-range');
            if (contentRange) resHeaders.set('Content-Range', contentRange);
            const contentLength = audioRes.headers.get('content-length');
            if (contentLength) resHeaders.set('Content-Length', contentLength);

            return new Response(audioRes.body, {
              status: audioRes.status,
              headers: resHeaders
            });
          }

          return errorResponse('No playable audio stream found for this video', 404);
        }

        if (pathname === '/api/youtube/search' || pathname === '/api/search' || pathname === '/api/youtube') {
          const q = url.searchParams.get('q') || '';
          const maxResults = parseInt(url.searchParams.get('maxResults') || '20', 10);
          const engine = (url.searchParams.get('engine') || 'youtubei').toLowerCase();

          if (engine === 'youtubei') {
            const cacheKey = `yt_innertube_search_${q}_${maxResults}`;
            const cached = await redisGet(env, cacheKey);
            if (cached) {
              return jsonResponse(cached, 200, {
                'X-Cache': 'HIT-REDIS',
                'Cache-Control': 'public, max-age=1800'
              });
            }
            let data = await Promise.race([
              searchYouTubeIMusic(q, maxResults),
              new Promise(resolve => setTimeout(() => resolve([]), 2500))
            ]);
            let payload = { items: Array.isArray(data) ? data : [] };
            if (!Array.isArray(data) || data.length === 0) {
              const ytKeys = parseKeys(env.YOUTUBE_API_KEYS);
              if (ytKeys.length > 0) {
                payload = await fetchYouTubeSearch(ytKeys, q, maxResults);
              }
            }
            if (payload && payload.items && payload.items.length > 0) {
              await redisSet(env, cacheKey, payload, 1800);
            }
            return jsonResponse(payload, 200, {
              'X-Cache': 'MISS',
              'Cache-Control': 'public, max-age=1800'
            });
          }

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

        if (pathname === '/api/youtube/category' || pathname === '/api/category') {
          const q = url.searchParams.get('q') || '';
          const maxResults = parseInt(url.searchParams.get('maxResults') || '20', 10);
          const engine = (url.searchParams.get('engine') || 'youtubei').toLowerCase();

          if (engine === 'youtubei') {
            const cacheKey = `yt_innertube_cat_${q}_${maxResults}`;
            const cached = await redisGet(env, cacheKey);
            if (cached) {
              return jsonResponse(cached, 200, {
                'X-Cache': 'HIT-REDIS',
                'Cache-Control': 'public, max-age=3600'
              });
            }
            let items = await Promise.race([
              searchYouTubeIMusic(q, maxResults),
              new Promise(resolve => setTimeout(() => resolve([]), 2500))
            ]);
            if (!Array.isArray(items) || items.length === 0) {
              const ytKeys = parseKeys(env.YOUTUBE_API_KEYS);
              if (ytKeys.length > 0) {
                items = await fetchYouTubeCategory(ytKeys, q, maxResults);
              }
            }
            if (Array.isArray(items) && items.length > 0) {
              await redisSet(env, cacheKey, items, 3600);
            }
            return jsonResponse(items, 200, {
              'X-Cache': 'MISS',
              'Cache-Control': 'public, max-age=3600'
            });
          }

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

          if (!title) {
            return jsonResponse(null, 200);
          }

          const cacheKey = ('meta_v4_' + provider + '_' + (fallback ? 'fb' : 'nofb') + '_' + artist + '_' + title).toLowerCase().replace(/[^a-z0-9]/g, '_');
          const cached = await redisGet(env, cacheKey);
          if (cached) {
            if (cached === '__not_found__' || cached?._notFound) {
              return jsonResponse(null, 200, {
                'X-Cache': 'HIT-REDIS-NEGATIVE',
                'Cache-Control': 'public, max-age=21600'
              });
            }
            return jsonResponse(cached, 200, {
              'X-Cache': 'HIT-REDIS',
              'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400'
            });
          }

          const metadata = await fetchMetadata(artist, title, env, provider, fallback);
          if (metadata && (metadata.cover || metadata.title)) {
            await redisSet(env, cacheKey, metadata, 1209600);
            return jsonResponse(metadata, 200, {
              'X-Cache': 'MISS',
              'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400'
            });
          }

          await redisSet(env, cacheKey, '__not_found__', 259200);
          return jsonResponse(null, 200, {
            'X-Cache': 'MISS-NEGATIVE',
            'Cache-Control': 'public, max-age=21600'
          });
        }

        if (pathname === '/api/lyrics' || pathname === '/api/lyric') {
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

        if (pathname === '/api/translate' || pathname === '/api/transiate') {
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

        if (pathname === '/api/cache') {
          const ALLOWED_PREFIXES = ['lyrics_', 'artist_img_', 'meta_', 'trans_'];

          if (request.method === 'GET') {
            const key = url.searchParams.get('key');
            if (!key) {
              return jsonResponse({
                status: 'ok',
                message: 'Cache gateway active. Specify ?key= to read cached entry.',
                allowedPrefixes: ALLOWED_PREFIXES
              }, 200);
            }
            if (!ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
              return errorResponse('Invalid or unauthorized cache key', 400);
            }

            const cached = await redisGet(env, key);
            if (cached !== null && cached !== undefined) {
              return jsonResponse({ data: cached }, 200, {
                'X-Cache': 'HIT-REDIS',
                'Cache-Control': 'public, max-age=3600'
              });
            }
            return jsonResponse({ data: null }, 200, {
              'X-Cache': 'MISS'
            });
          }

          if (request.method === 'POST') {
            let body = null;
            try {
              body = await request.json();
            } catch {
              return errorResponse('Invalid JSON body', 400);
            }

            const key = body?.key;
            const data = body?.data;
            const ttl = Math.min(Math.max(parseInt(body?.ttl || '86400', 10), 60), 2592000);

            if (!key || !ALLOWED_PREFIXES.some(p => key.startsWith(p)) || data === undefined) {
              return errorResponse('Invalid key or missing data', 400);
            }

            const serialized = typeof data === 'string' ? data : JSON.stringify(data);
            if (serialized.length > 256 * 1024) {
              return errorResponse('Payload too large', 413);
            }

            await redisSet(env, key, data, ttl);
            return jsonResponse({ success: true, key }, 200);
          }

          return errorResponse('Method not allowed', 405);
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
