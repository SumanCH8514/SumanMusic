import { parseKeys } from '../utils/response.js';

export async function proxyStream(request, env, url) {
  const fileId = url.searchParams.get('fileId') || '';
  if (!fileId) {
    return new Response(JSON.stringify({ error: 'fileId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const queryKey = url.searchParams.get('key') || url.searchParams.get('apiKey') || '';
  const envKeys = parseKeys(env.GDRIVE_API_KEYS);
  const candidateKeys = [...new Set([queryKey, ...envKeys])].filter(k => k && k.length > 10 && !k.includes("YOUR_"));

  const rangeHeader = request.headers.get('Range');
  const reqHeaders = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  if (rangeHeader) {
    reqHeaders['Range'] = rangeHeader;
  }

  let streamRes = null;

  for (const apiKey of candidateKeys) {
    try {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      const res = await fetch(driveUrl, { headers: reqHeaders });
      if (res.status === 200 || res.status === 206) {
        streamRes = res;
        break;
      }
    } catch {}
  }

  if (!streamRes) {
    const directUrls = [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://docs.google.com/uc?export=download&id=${fileId}`
    ];
    for (const fallbackUrl of directUrls) {
      try {
        const res = await fetch(fallbackUrl, { headers: reqHeaders });
        if (res.status === 200 || res.status === 206) {
          streamRes = res;
          break;
        }
      } catch {}
    }
  }

  if (streamRes) {
    const responseHeaders = new Headers(streamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    responseHeaders.set('Accept-Ranges', 'bytes');
    if (!responseHeaders.has('Content-Type') || responseHeaders.get('Content-Type') === 'application/octet-stream') {
      responseHeaders.set('Content-Type', 'audio/mpeg');
    }
    responseHeaders.set('Cache-Control', 'public, max-age=86400');

    return new Response(streamRes.body, {
      status: streamRes.status,
      statusText: streamRes.statusText,
      headers: responseHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Failed to stream audio file' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' }
  });
}
