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

const crypto = require('crypto');

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

// ─────────────────────────────────────────────────────────────────────────────
// Client Token Generation (reverse-engineered from MovieBox JS bundle)
// ─────────────────────────────────────────────────────────────────────────────

function generateClientToken() {
  const ts  = Math.floor(Date.now() / 1000);
  const rev = String(ts).split('').reverse().join('');
  const hash = crypto.createHash('md5').update(rev).digest('hex');
  return `${ts}.${hash}`;
}

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
