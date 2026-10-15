const CRAWLER_REGEX = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Embedly|googlebot|TelegramBot|Slackbot|discordbot|Applebot|Pingdom|Tumblr/i;
const BACKEND_URL = 'https://api.backend.songs.sumanonline.com';
const DEFAULT_TITLE = 'SumanMusic | Premium Music Streaming';
const DEFAULT_DESC = 'Stream your personal music library and discover tracks on SumanMusic with high quality playback.';
const DEFAULT_IMAGE = 'https://songs.sumanonline.com/favicon.png';

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const userAgent = request.headers.get('User-Agent') || '';
    const isCrawler = CRAWLER_REGEX.test(userAgent);

    if (pathname.startsWith('/share')) {
      let trackId = url.searchParams.get('v') || url.searchParams.get('trackId') || '';

      if (!trackId) {
        const decodedPath = decodeURIComponent(pathname);
        const shareSubPath = decodedPath.replace(/^\/share\/?/, '');
        if (shareSubPath) {
          trackId = shareSubPath.replace(/^v=/, '').split('/')[0];
        }
      }

      let meta = {
        title: DEFAULT_TITLE,
        desc: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: request.url
      };

      if (trackId) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/track?id=${encodeURIComponent(trackId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.title) {
              const cleanTitle = String(data.title).replace(/["']/g, '').trim();
              const artistStr = String(data.artist || 'SumanMusic').replace(/["']/g, '').trim();
              meta.title = `${cleanTitle} • ${artistStr} | SumanMusic`;
              meta.desc = `Listen to ${cleanTitle} by ${artistStr} on SumanMusic • High Quality Audio`;
              meta.image = data.cover || data.thumbnail || DEFAULT_IMAGE;
            }
          }
        } catch {}
      }

      if (isCrawler) {
        const safeTitle = escapeHtml(meta.title);
        const safeDesc = escapeHtml(meta.desc);
        const safeImage = escapeHtml(meta.image);
        const safeUrl = escapeHtml(meta.url);

        const crawlerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:site_name" content="SumanMusic" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url" content="${safeUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="theme-color" content="#1db954" />
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <img src="${safeImage}" alt="${safeTitle}" />
</body>
</html>`;
        return new Response(crawlerHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      let assetResponse = await env.ASSETS.fetch(request);
      if (!assetResponse.ok || assetResponse.status === 404 || assetResponse.status === 307) {
        assetResponse = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
      }

      if (assetResponse.ok && typeof globalThis.HTMLRewriter !== 'undefined') {
        const rewriter = new globalThis.HTMLRewriter()
          .on('title', {
            element(el) {
              el.setInnerContent(meta.title);
            }
          })
          .on('meta[property="og:title"]', {
            element(el) {
              el.setAttribute('content', meta.title);
            }
          })
          .on('meta[property="og:description"]', {
            element(el) {
              el.setAttribute('content', meta.desc);
            }
          })
          .on('meta[property="og:image"]', {
            element(el) {
              el.setAttribute('content', meta.image);
            }
          })
          .on('meta[property="og:url"]', {
            element(el) {
              el.setAttribute('content', meta.url);
            }
          })
          .on('meta[property="twitter:title"], meta[name="twitter:title"]', {
            element(el) {
              el.setAttribute('content', meta.title);
            }
          })
          .on('meta[property="twitter:description"], meta[name="twitter:description"]', {
            element(el) {
              el.setAttribute('content', meta.desc);
            }
          })
          .on('meta[property="twitter:image"], meta[name="twitter:image"]', {
            element(el) {
              el.setAttribute('content', meta.image);
            }
          });

        return rewriter.transform(assetResponse);
      }
    }

    if (pathname.startsWith('/assets/')) {
      const assetRes = await env.ASSETS.fetch(request);
      if (!assetRes.ok || assetRes.headers.get('content-type')?.includes('text/html')) {
        return new Response('Asset not found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-store'
          }
        });
      }
      return assetRes;
    }

    return env.ASSETS.fetch(request);
  }
};
