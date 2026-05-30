/**
 * MovieBox — Nuvio Stream Plugin (Fixed for New API)
 * Source: https://h5-api.aoneroom.com (MovieBox H5 API)
 *
 * Fixed issues:
 *   [1] Updated API base from h5.aoneroom.com -> h5-api.aoneroom.com
 *   [2] New search endpoint: /wefeed-h5api-bff/subject/search
 *   [3] New download endpoint: /wefeed-h5api-bff/subject/download
 *   [4] Added X-Client-Token header (MD5 of reversed unix timestamp)
 *   [5] Added X-Request-Lang header
 *   [6] Series suffix stripping (Breaking Bad S1 -> Breaking Bad)
 */
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pure JS MD5 (no Node.js crypto dependency — works in Nuvio mobile)
// ─────────────────────────────────────────────────────────────────────────────

function md5(s) {
  function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
  function md5blk(s) { var i, md5blks = []; for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24); return md5blks; }
  function md51(s) { var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, len; for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i))); s = s.substring(i - 64); var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); tail[i >> 2] |= 0x80 << ((i % 4) << 3); if (i > 55) { md5cycle(state, tail); tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; } tail[14] = n * 8; md5cycle(state, tail); return state; }
  function hex(s) { var h = '', i; for (i = 0; i < 4; i++) { h += ('0' + ((s[i] >>> 0) & 0xFF).toString(16)).slice(-2) + ('0' + ((s[i] >>> 8) & 0xFF).toString(16)).slice(-2) + ('0' + ((s[i] >>> 16) & 0xFF).toString(16)).slice(-2) + ('0' + ((s[i] >>> 24) & 0xFF).toString(16)).slice(-2); } return h; }
  return hex(md51(s));
}

function generateClientToken() {
  var ts  = Math.floor(Date.now() / 1000);
  var rev = String(ts).split('').reverse().join('');
  var hash = md5(rev);
  return ts + '.' + hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const TMDB_KEY      = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE     = 'https://api.themoviedb.org/3';
const MB_API_HOST   = 'h5-api.aoneroom.com';
const MB_API_BASE   = 'https://' + MB_API_HOST;
const MB_WEB_HOST   = 'h5.aoneroom.com';
const MB_WEB_BASE   = 'https://' + MB_WEB_HOST;
const REFERER_SPOOF = 'https://fmoviesunblocked.net';
const TAG           = '[MovieBox]';

function baseHeaders(extra = {}) {
  return {
    'X-Client-Token': generateClientToken(),
    'X-Request-Lang' : 'en',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept'         : 'application/json',
    'Referer'        : MB_WEB_BASE + '/',
    'Origin'         : MB_WEB_BASE,
    'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LRU Cache
// ─────────────────────────────────────────────────────────────────────────────

class LRUCache {
  constructor(max = 300, ttlMs = 20 * 60 * 1000) {
    this.max   = max;
    this.ttl   = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttl) { this.store.delete(key); return undefined; }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.max) {
      this.store.delete(this.store.keys().next().value);
    }
    this.store.set(key, { value, ts: Date.now() });
  }
}

const cache = new LRUCache();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function apiFetch(url, opts = {}) {
  const headers = baseHeaders(opts.headers);
  const init    = { ...opts, headers };
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(TAG, 'Error', res.status, body.substring(0, 200));
  }
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — TMDB lookup
// ─────────────────────────────────────────────────────────────────────────────

async function getTmdbInfo(tmdbId, mediaType) {
  const type    = (mediaType === 'series' || mediaType === 'tv') ? 'tv' : 'movie';
  const url     = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_KEY}`;
  const res     = await fetch(url);
  const data    = await res.json();
  const title   = type === 'tv' ? data.name : data.title;
  const dateStr = type === 'tv' ? data.first_air_date : data.release_date;
  const year    = dateStr ? parseInt(dateStr.split('-')[0], 10) : null;
  return { title, year, type };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — search MovieBox (new API)
// ─────────────────────────────────────────────────────────────────────────────

async function searchMovieBox(title, type) {
  const subjectType = type === 'tv' ? 2 : 1;
  const res  = await apiFetch(MB_API_BASE + '/wefeed-h5api-bff/subject/search', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ keyword: title, page: 1, perPage: 24, subjectType }),
  });
  const json  = await res.json();
  const items = json.data?.items || [];

  if (!items.length) return [];

  const SERIES_SUFFIX = /\s+S\d+(?:-S?\d+)*$/i;
  const escaped = escapeRegExp(title);
  const matchRe = new RegExp('^' + escaped + '(?: \\[([^\\]]+)\\])?$', 'i');

  const seen    = new Set();
  const matched = [];

  for (const item of items) {
    const id = item.subjectId;
    if (!id || seen.has(id)) continue;

    const cleanTitle = (item.title || '').replace(SERIES_SUFFIX, '').trim();
    const m = cleanTitle.match(matchRe);
    if (!m) continue;

    const language = m[1] || 'Original';
    seen.add(id);
    matched.push({ id, language, detailPath: item.detailPath || '' });
  }

  matched.sort((a, b) => {
    if (a.language === 'Original') return -1;
    if (b.language === 'Original') return  1;
    return 0;
  });

  return matched;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — fetch downloads (new API)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDownloads(subjectId, detailPath, season, episode) {
  let qs = 'subjectId=' + subjectId;
  if (season  != null) qs += '&se=' + season;
  if (episode != null) qs += '&ep=' + episode;

  const res  = await apiFetch(MB_API_BASE + '/wefeed-h5api-bff/subject/download?' + qs, {
    headers: { Referer: `${REFERER_SPOOF}/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail` },
  });
  const json = await res.json();
  return json.data?.downloads || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — build stream objects
// ─────────────────────────────────────────────────────────────────────────────

function buildStream(dl, language) {
  const url = dl.url;
  if (!url) return null;

  const res     = dl.resolution || 720;
  const quality = res + 'p';

  const nameParts = ['MovieBox', language].filter(p => p && p.trim());
  const name      = nameParts.join(' - ') + ' | ' + quality;

  let type = null;
  if (url.includes('.m3u8'))  type = 'hls';
  else if (url.includes('.mp4') || url.includes('.mkv')) type = 'video';

  return {
    name,
    title   : quality,
    url,
    quality,
    type,
    headers : { Referer: REFERER_SPOOF + '/', Origin: REFERER_SPOOF },
    provider: 'moviebox',
    behaviorHints: { bingeGroup: 'moviebox', notWebReady: false },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

async function getStreams(tmdbId, type, season, episode) {
  const mediaType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
  const isTv      = mediaType === 'tv';
  const se        = isTv && season  != null ? parseInt(season,  10) : null;
  const ep        = isTv && episode != null ? parseInt(episode, 10) : null;

  const cacheKey = `mb_${tmdbId}_${mediaType}_${se}_${ep}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { title, year } = await getTmdbInfo(tmdbId, mediaType);
    if (!title) return [];

    const subjects = await searchMovieBox(title, mediaType);
    if (!subjects.length) return [];

    const seenUrls = new Set();
    const streams  = [];

    for (const { id, language, detailPath } of subjects) {
      try {
        const downloads = await fetchDownloads(id, detailPath, se, ep);
        for (const dl of downloads) {
          if (!dl.url || seenUrls.has(dl.url)) continue;
          seenUrls.add(dl.url);
          const stream = buildStream(dl, language);
          if (stream) streams.push(stream);
        }
      } catch (err) {
        console.error(TAG, `Error processing subject ${id}:`, err.message);
      }
    }

    streams.sort((a, b) => {
      const pa = parseInt(a.quality) || 0;
      const pb = parseInt(b.quality) || 0;
      return pb - pa;
    });

    if (streams.length) cache.set(cacheKey, streams);
    return streams;

  } catch (err) {
    console.error(TAG, 'Fatal error:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
