const PLAYER_CLIENTS = [
  {
    name: 'TV_EMBED',
    context: {
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'en',
        gl: 'US'
      },
      thirdParty: { embedUrl: 'https://www.google.com' }
    },
    userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15'
  },
  {
    name: 'ANDROID',
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.09.37',
        androidSdkVersion: 30,
        hl: 'en',
        gl: 'US',
        osName: 'Android',
        osVersion: '11',
        platform: 'MOBILE'
      }
    },
    userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip'
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.09.3',
        deviceModel: 'iPhone14,3',
        hl: 'en',
        gl: 'US',
        osName: 'iOS',
        osVersion: '15.6',
        platform: 'MOBILE'
      }
    },
    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)'
  },
  {
    name: 'WEB_EMBED',
    context: {
      client: {
        clientName: 'WEB_EMBEDDED_PLAYER',
        clientVersion: '1.20240410.01.00',
        hl: 'en',
        gl: 'US'
      },
      thirdParty: { embedUrl: 'https://www.google.com' }
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  },
  {
    name: 'WEB',
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240410.01.00',
        hl: 'en',
        gl: 'US'
      }
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  }
];

function extractBestAudio(streamingData) {
  if (!streamingData) return null;

  const allFormats = [
    ...(streamingData.adaptiveFormats || []),
    ...(streamingData.formats || [])
  ];

  const audioFormats = allFormats.filter(f =>
    f.mimeType &&
    f.mimeType.startsWith('audio/') &&
    f.url
  );

  if (audioFormats.length === 0) return null;

  const preferred = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  const chosen = preferred[0];

  return {
    url: chosen.url,
    mimeType: chosen.mimeType,
    contentLength: chosen.contentLength,
    bitrate: chosen.bitrate,
    duration: chosen.approxDurationMs
      ? Math.round(parseInt(chosen.approxDurationMs, 10) / 1000)
      : null
  };
}

export async function getYouTubeIAudioUrl(videoId) {
  if (!videoId) return null;
  const cleanId = String(videoId).replace(/^yt_/, '');

  for (const client of PLAYER_CLIENTS) {
    try {
      const body = {
        context: client.context,
        videoId: cleanId,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: 19950
          }
        },
        racyCheckOk: true,
        contentCheckOk: true
      };

      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'X-YouTube-Client-Name': client.context.client.clientName === 'ANDROID' ? '3' :
            client.context.client.clientName === 'IOS' ? '5' :
            client.context.client.clientName === 'TVHTML5_SIMPLY_EMBEDDED_PLAYER' ? '85' :
            client.context.client.clientName === 'WEB_EMBEDDED_PLAYER' ? '56' : '1',
          'X-YouTube-Client-Version': client.context.client.clientVersion
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) continue;

      const data = await res.json();

      const status = data.playabilityStatus?.status;
      if (status !== 'OK') continue;

      const audio = extractBestAudio(data.streamingData);
      if (audio) {
        audio.client = client.name;
        return audio;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function getYouTubeIAudioStream(videoId) {
  return null;
}

export async function searchYouTubeIMusic(query, maxResults = 20) {
  if (!query || !query.trim()) return [];

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240410.01.00',
            hl: 'en',
            gl: 'US'
          }
        },
        query: query.trim()
      })
    });

    if (!res.ok) return [];

    const data = await res.json();
    const sectionList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const section of sectionList) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (results.length >= maxResults) break;
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;

        const id = v.videoId;
        const rawTitle = v.title?.runs?.map(r => r.text).join('') || '';
        const artist = v.ownerText?.runs?.map(r => r.text).join('') || v.shortBylineText?.runs?.map(r => r.text).join('') || 'YouTube Music';
        const durationStr = v.lengthText?.simpleText || '0:00';
        const parts = durationStr.split(':').map(Number);
        const durationSeconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : (parts.length === 2 ? parts[0] * 60 + parts[1] : 0);

        const thumbs = v.thumbnail?.thumbnails || [];
        const bestCover = thumbs.length > 0 ? (thumbs[thumbs.length - 1]?.url || thumbs[0]?.url) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        results.push({
          id: `yt_${id}`,
          videoId: id,
          title: rawTitle.replace(/\[.*?\]|\(.*?\)/g, '').trim() || rawTitle,
          artist: artist,
          cover: bestCover,
          thumbnail: thumbs[0]?.url || bestCover,
          url: `https://www.youtube.com/watch?v=${id}`,
          isYouTube: true,
          duration: durationSeconds,
          durationStr: durationStr
        });
      }
    }

    return results;
  } catch (err) {
    console.error('searchYouTubeIMusic error:', err);
    return [];
  }
}
