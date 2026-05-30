// MovieBox Cloudflare Worker
// Uses built-in Cache API (no KV setup needed)

const TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
const H5_API = 'https://h5-api.aoneroom.com';
const SITE = 'https://themoviebox.org';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

async function md5(str) {
  const bytes = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

async function genClientToken() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const rev = ts.split('').reverse().join('');
  const hash = await md5(rev);
  return ts + '.' + hash;
}

function apiHeaders(token, extra) {
  const h = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': SITE,
    'Referer': SITE + '/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'x-client-info': '{"timezone":"Asia/Calcutta"}',
    'x-request-lang': 'en',
    'X-Client-Token': token
  };
  if (extra) Object.assign(h, extra);
  return h;
}

async function apiCall(method, url, body, headers) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) return null;
  try { return await res.json(); } catch(e) { return null; }
}

async function getTmdb(tmdbId, type) {
  const mt = type === 'tv' ? 'tv' : 'movie';
  const res = await fetch(`https://api.themoviedb.org/3/${mt}/${tmdbId}?api_key=${TMDB_KEY}`);
  const d = await res.json();
  return {
    title: mt === 'movie' ? (d.title || d.original_title) : (d.name || d.original_name),
    year: (d.release_date || d.first_air_date || '').substring(0, 4),
    mediaType: mt
  };
}

function normTitle(s) {
  if (!s) return '';
  return s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ')
    .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu)\b/gi, ' ')
    .replace(/\b(dual audio)\b/gi, ' ')
    .trim().toLowerCase().replace(/:/g, ' ')
    .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
}

function extractLang(title) {
  if (!title) return 'Original';
  const m = title.match(/\[([^\]]+)\]/);
  if (m) {
    const lang = m[1].trim();
    return lang.toLowerCase().indexOf('dub') >= 0 ? lang : lang + ' Dub';
  }
  return 'Original';
}

function baseTitle(title) {
  if (!title) return '';
  return title.replace(/\s*S\d+(?:-S?\d+)*$/i, '').replace(/\s*\[.*?\]\s*/g, ' ').trim();
}

function findMatches(items, tmdbTitle, tmdbYear, mediaType) {
  const norm = normTitle(tmdbTitle);
  const target = mediaType === 'movie' ? 1 : 2;
  const results = [];
  const seen = {};
  for (const it of items) {
    if (it.subjectType !== target || seen[it.subjectId]) continue;
    const bt = baseTitle(it.title);
    const nt = normTitle(bt);
    const yr = it.year || (it.releaseDate ? it.releaseDate.substring(0, 4) : null);
    let score = 0;
    if (nt === norm) score += 50;
    else if (nt.includes(norm) || norm.includes(nt)) score += 15;
    if (tmdbYear && yr && tmdbYear == yr) score += 35;
    if (score >= 40) {
      seen[it.subjectId] = true;
      results.push({
        id: it.subjectId,
        lang: extractLang(it.title),
        dp: it.detailPath || '',
        title: it.title
      });
    }
  }
  results.sort((a, b) => a.lang === 'Original' ? -1 : b.lang === 'Original' ? 1 : 0);
  return results;
}

async function getDownloads(token, subjectId, se, ep, detailPath) {
  let url = `${H5_API}/wefeed-h5api-bff/subject/download?subjectId=${subjectId}`;
  if (se != null) url += `&se=${se}`;
  if (ep != null) url += `&ep=${ep}`;
  const res = await apiCall('GET', url, null, apiHeaders(token, {
    'Referer': `${SITE}/watch/${detailPath}`
  }));
  return (res && res.data && res.data.downloads) || [];
}

async function getDetail(token, detailPath) {
  const res = await apiCall('GET', `${H5_API}/wefeed-h5api-bff/detail?detailPath=${detailPath}`, null, apiHeaders(token));
  return res && res.data;
}

function buildStreams(downloads, lang) {
  const seen = {};
  const result = [];
  for (const dl of downloads) {
    if (!dl.url || seen[dl.url]) continue;
    seen[dl.url] = true;
    const qual = (dl.resolution || 'Auto') + 'p';
    let ft = null;
    const u = dl.url.toLowerCase();
    if (u.includes('.m3u8')) ft = 'hls';
    else if (u.includes('.mp4') || u.includes('.mkv')) ft = 'video';
    const nameParts = ['MovieBox'];
    if (lang && lang !== 'Original') nameParts.push(lang);
    nameParts.push(qual);
    result.push({
      name: nameParts.join(' | '),
      title: qual,
      url: dl.url,
      quality: qual,
      type: ft,
      headers: { 'Referer': SITE + '/', 'Origin': SITE },
      provider: 'moviebox'
    });
  }
  return result;
}

async function fetchStreams(tmdbId, type, season, episode) {
  const details = await getTmdb(tmdbId, type);
  if (!details) return [];

  const token = await genClientToken();
  const searchRes = await apiCall('POST', `${H5_API}/wefeed-h5api-bff/subject/search`, {
    keyword: details.title, page: 1, perPage: 28, subjectType: 0
  }, apiHeaders(token));

  const items = (searchRes && searchRes.data && searchRes.data.items) || [];
  const matches = findMatches(items, details.title, details.year, details.mediaType);
  if (matches.length === 0) return [];

  const isTv = details.mediaType === 'tv';
  const se = isTv ? (parseInt(season) || 1) : 0;
  const ep = isTv ? (parseInt(episode) || 1) : 0;

  const seenIds = {};
  const unique = matches.filter(m => {
    if (seenIds[m.id]) return false;
    seenIds[m.id] = true;
    return true;
  });

  let detailData = null;
  if (isTv && unique.length > 0) {
    detailData = await getDetail(token, unique[0].dp);
  }

  const allStreams = [];
  const promises = unique.map(async (m) => {
    let useSe = se, useEp = ep;
    if (isTv && detailData && detailData.resource && detailData.resource.seasons) {
      for (const s of detailData.resource.seasons) {
        if (s.se == se) {
          if (s.maxEp > 0 && ep > s.maxEp) useEp = s.maxEp;
          break;
        }
      }
    }
    const dls = await getDownloads(token, m.id, useSe, useEp, m.dp);
    return buildStreams(dls, m.lang);
  });

  const results = await Promise.all(promises);
  for (const r of results) allStreams.push(...r);

  allStreams.sort((a, b) => {
    const qa = parseInt(a.quality) || 0;
    const qb = parseInt(b.quality) || 0;
    if (qb !== qa) return qb - qa;
    return a.name.includes('Original') ? -1 : 1;
  });

  return allStreams;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/streams') {
      const tmdbId = url.searchParams.get('tmdb_id');
      const type = url.searchParams.get('type') || 'movie';
      const season = url.searchParams.get('season');
      const episode = url.searchParams.get('episode');

      if (!tmdbId) {
        return new Response(JSON.stringify({ error: 'Provide tmdb_id' }), {
          status: 400, headers: corsHeaders
        });
      }

      try {
        const cacheKey = `https://moviebox-cache.dev/${tmdbId}:${type}:${season || 0}:${episode || 0}`;
        const cache = caches.default;
        const cached = await cache.match(cacheKey);
        if (cached) {
          const data = await cached.json();
          return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        const streams = await fetchStreams(tmdbId, type, season, episode);
        const response = { streams };

        const cacheResponse = new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Cache-Control': 'max-age=1200' }
        });
        await cache.put(cacheKey, cacheResponse.clone());

        return new Response(JSON.stringify(response), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, streams: [] }), {
          status: 500, headers: corsHeaders
        });
      }
    }

    return new Response(JSON.stringify({
      name: 'MovieBox Worker',
      usage: '/streams?tmdb_id=XXX&type=movie|tv&season=1&episode=1'
    }), { headers: corsHeaders });
  }
};
