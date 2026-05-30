// MovieBox Backend for Render.com
// Deploy free at render.com → New Web Service → GitHub repo

const http = require('http');
const https = require('https');

const TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
const H5_API = 'https://h5-api.aoneroom.com';
const SITE = 'https://themoviebox.org';
const PORT = process.env.PORT || 3000;

// In-memory cache (persists across requests on same server)
const cache = new Map();
const CACHE_TTL = 20 * 60 * 1000;

function getCached(key) {
  const e = cache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return undefined; }
  return e.val;
}

function setCached(key, val) {
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { val, ts: Date.now() });
}

// MD5 for token generation
function md5(str) {
  function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);
  }
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  function md51(s){var n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i;for(i=64;i<=n;i+=64)md5cycle(state,md5blk(s.substring(i-64,i)));s=s.substring(i-64);var tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);tail[i>>2]|=0x80<<((i%4)<<3);if(i>55){md5cycle(state,tail);for(i=0;i<16;i++)tail[i]=0;}tail[14]=n*8;md5cycle(state,tail);return state;}
  function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4)md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return md5blks;}
  var hex_chr='0123456789abcdef'.split('');
  function rhex(n){var s='',j=0;for(;j<4;j++)s+=hex_chr[(n>>(j*8+4))&0x0f]+hex_chr[(n>>(j*8))&0x0f];return s;}
  function hex(x){for(var i=0;i<x.length;i++)x[i]=rhex(x[i]);return x.join('');}
  function add32(a,b){return(a+b)&0xFFFFFFFF;}
  return hex(md51(str));
}

function genToken() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const rev = ts.split('').reverse().join('');
  return ts + '.' + md5(rev);
}

function apiHeaders(token, extra) {
  const h = {
    'Accept': 'application/json', 'Content-Type': 'application/json',
    'Origin': SITE, 'Referer': SITE + '/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'x-client-info': '{"timezone":"Asia/Calcutta"}', 'x-request-lang': 'en',
    'X-Client-Token': token
  };
  if (extra) Object.assign(h, extra);
  return h;
}

function apiCall(method, url, body, headers) {
  return new Promise((resolve) => {
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    https.request(url, opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null)).end();
  });
}

function fetchJSON(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function getTmdb(tmdbId, type) {
  const ck = 'tmdb_' + tmdbId;
  const c = getCached(ck);
  if (c) return c;
  const mt = type === 'tv' ? 'tv' : 'movie';
  const d = await fetchJSON(`https://api.themoviedb.org/3/${mt}/${tmdbId}?api_key=${TMDB_KEY}`);
  if (!d) return null;
  const result = {
    title: mt === 'movie' ? (d.title || d.original_title) : (d.name || d.original_name),
    year: (d.release_date || d.first_air_date || '').substring(0, 4),
    mediaType: mt
  };
  setCached(ck, result);
  return result;
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
  if (m) { const l = m[1].trim(); return l.toLowerCase().indexOf('dub') >= 0 ? l : l + ' Dub'; }
  return 'Original';
}

function baseTitle(title) {
  if (!title) return '';
  return title.replace(/\s*S\d+(?:-S?\d+)*$/i, '').replace(/\s*\[.*?\]\s*/g, ' ').trim();
}

function findMatches(items, tmdbTitle, tmdbYear, mediaType) {
  const norm = normTitle(tmdbTitle);
  const target = mediaType === 'movie' ? 1 : 2;
  const results = []; const seen = {};
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
      results.push({ id: it.subjectId, lang: extractLang(it.title), dp: it.detailPath || '', title: it.title });
    }
  }
  results.sort((a, b) => a.lang === 'Original' ? -1 : b.lang === 'Original' ? 1 : 0);
  return results;
}

async function getDownloads(token, subjectId, se, ep, detailPath) {
  const ck = 'dl_' + subjectId + '_' + se + '_' + ep;
  const c = getCached(ck);
  if (c) return c;
  let url = `${H5_API}/wefeed-h5api-bff/subject/download?subjectId=${subjectId}`;
  if (se != null) url += `&se=${se}`;
  if (ep != null) url += `&ep=${ep}`;
  const res = await apiCall('GET', url, null, apiHeaders(token, { 'Referer': `${SITE}/watch/${detailPath}` }));
  const dls = (res && res.data && res.data.downloads) || [];
  setCached(ck, dls);
  return dls;
}

async function getDetail(token, detailPath) {
  const ck = 'detail_' + detailPath;
  const c = getCached(ck);
  if (c) return c;
  const res = await apiCall('GET', `${H5_API}/wefeed-h5api-bff/detail?detailPath=${detailPath}`, null, apiHeaders(token));
  const data = res && res.data;
  setCached(ck, data);
  return data;
}

function buildStreams(downloads, lang) {
  const seen = {}; const result = [];
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
      name: nameParts.join(' | '), title: qual, url: dl.url,
      quality: qual, type: ft,
      headers: { 'Referer': SITE + '/', 'Origin': SITE },
      provider: 'moviebox'
    });
  }
  return result;
}

async function fetchStreams(tmdbId, type, season, episode) {
  const details = await getTmdb(tmdbId, type);
  if (!details) return [];
  const token = genToken();
  const searchRes = await apiCall('POST', `${H5_API}/wefeed-h5api-bff/subject/search`, {
    keyword: details.title, page: 1, perPage: 28, subjectType: 0
  }, apiHeaders(token));
  const items = (searchRes && searchRes.data && searchRes.data.items) || [];
  const matches = findMatches(items, details.title, details.year, details.mediaType);
  if (matches.length === 0) return [];
  const isTv = details.mediaType === 'tv';
  const se = isTv ? (parseInt(season) || 1) : 0;
  const ep = isTv ? (parseInt(episode) || 1) : 0;
  const seenIds = {}; const unique = matches.filter(m => { if (seenIds[m.id]) return false; seenIds[m.id] = true; return true; });
  let detailData = null;
  if (isTv && unique.length > 0) detailData = await getDetail(token, unique[0].dp);
  const allStreams = [];
  const promises = unique.map(async (m) => {
    let useSe = se, useEp = ep;
    if (isTv && detailData && detailData.resource && detailData.resource.seasons) {
      for (const s of detailData.resource.seasons) {
        if (s.se == se) { if (s.maxEp > 0 && ep > s.maxEp) useEp = s.maxEp; break; }
      }
    }
    const dls = await getDownloads(token, m.id, useSe, useEp, m.dp);
    return buildStreams(dls, m.lang);
  });
  const results = await Promise.all(promises);
  for (const r of results) allStreams.push(...r);
  allStreams.sort((a, b) => {
    const qa = parseInt(a.quality) || 0; const qb = parseInt(b.quality) || 0;
    if (qb !== qa) return qb - qa;
    return a.name.includes('Original') ? -1 : 1;
  });
  return allStreams;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (url.pathname === '/streams') {
    const tmdbId = url.searchParams.get('tmdb_id');
    const type = url.searchParams.get('type') || 'movie';
    const season = url.searchParams.get('season');
    const episode = url.searchParams.get('episode');

    if (!tmdbId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Provide tmdb_id' }));
      return;
    }

    try {
      const streams = await fetchStreams(tmdbId, type, season, episode);
      res.end(JSON.stringify({ streams }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message, streams: [] }));
    }
    return;
  }

  res.end(JSON.stringify({ name: 'MovieBox Backend', usage: '/streams?tmdb_id=XXX&type=movie|tv&season=1&episode=1' }));
});

server.listen(PORT, () => console.log(`MovieBox backend running on port ${PORT}`));
