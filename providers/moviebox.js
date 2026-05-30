var __async = function(__this, __arguments, generator) {
  return new Promise(function(resolve, reject) {
    var fulfilled = function(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = function(value) {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = function(x) {
      return x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    };
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// Pure JS MD5
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
  var ts = Math.floor(Date.now() / 1000);
  var rev = String(ts).split('').reverse().join('');
  var hash = md5(rev);
  return ts + '.' + hash;
}

var TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
var TMDB_BASE = 'https://api.themoviedb.org/3';
var MB_API_BASE = 'https://h5-api.aoneroom.com';
var MB_WEB_BASE = 'https://h5.aoneroom.com';
var REFERER_SPOOF = 'https://fmoviesunblocked.net';
var TAG = '[MovieBox]';

function baseHeaders(extra) {
  var h = {
    'X-Client-Token': generateClientToken(),
    'X-Request-Lang': 'en',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'Referer': MB_WEB_BASE + '/',
    'Origin': MB_WEB_BASE,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (extra) {
    for (var key in extra) {
      if (extra.hasOwnProperty(key)) h[key] = extra[key];
    }
  }
  return h;
}

var cache = {};
var CACHE_TTL = 20 * 60 * 1000;

function cacheGet(key) {
  var entry = cache[key];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { delete cache[key]; return undefined; }
  return entry.value;
}

function cacheSet(key, value) {
  var keys = Object.keys(cache);
  if (keys.length >= 300) delete cache[keys[0]];
  cache[key] = { value: value, ts: Date.now() };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function*() {
    var type = mediaType === 'series' || mediaType === 'tv' ? 'tv' : 'movie';
    var url = TMDB_BASE + '/' + type + '/' + tmdbId + '?api_key=' + TMDB_KEY;
    var res = yield fetch(url);
    var data = yield res.json();
    var title = type === 'tv' ? data.name : data.title;
    var dateStr = type === 'tv' ? data.first_air_date : data.release_date;
    var year = dateStr ? parseInt(dateStr.split('-')[0], 10) : null;
    return { title: title, year: year, type: type };
  });
}

function searchMovieBox(title, type) {
  return __async(this, null, function*() {
    var subjectType = type === 'tv' ? 2 : 1;
    var res = yield fetch(MB_API_BASE + '/wefeed-h5api-bff/subject/search', {
      method: 'POST',
      headers: baseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ keyword: title, page: 1, perPage: 24, subjectType: subjectType })
    });
    var json = yield res.json();
    var items = json.data && json.data.items ? json.data.items : [];

    if (!items.length) return [];

    var SERIES_SUFFIX = /\s+S\d+(?:-S?\d+)*$/i;
    var escaped = escapeRegExp(title);
    var matchRe = new RegExp('^' + escaped + '(?: \\[([^\\]]+)\\])?$', 'i');
    var seen = {};
    var matched = [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var id = item.subjectId;
      if (!id || seen[id]) continue;
      var cleanTitle = (item.title || '').replace(SERIES_SUFFIX, '').trim();
      var m = cleanTitle.match(matchRe);
      if (!m) continue;
      var language = m[1] || 'Original';
      seen[id] = true;
      matched.push({ id: id, language: language, detailPath: item.detailPath || '' });
    }

    matched.sort(function(a, b) {
      if (a.language === 'Original') return -1;
      if (b.language === 'Original') return 1;
      return 0;
    });

    return matched;
  });
}

function fetchDownloads(subjectId, detailPath, season, episode) {
  return __async(this, null, function*() {
    var qs = 'subjectId=' + subjectId;
    if (season != null) qs += '&se=' + season;
    if (episode != null) qs += '&ep=' + episode;
    var referer = REFERER_SPOOF + '/spa/videoPlayPage/movies/' + detailPath + '?id=' + subjectId + '&type=/movie/detail';
    var res = yield fetch(MB_API_BASE + '/wefeed-h5api-bff/subject/download?' + qs, {
      headers: baseHeaders({ Referer: referer })
    });
    var json = yield res.json();
    return json.data && json.data.downloads ? json.data.downloads : [];
  });
}

function buildStream(dl, language) {
  var url = dl.url;
  if (!url) return null;
  var res = dl.resolution || 720;
  var quality = res + 'p';
  var name = 'MovieBox' + (language && language !== 'Original' ? ' [' + language + ']' : '') + ' | ' + quality;
  var type = url.indexOf('.m3u8') !== -1 ? 'hls' : (url.indexOf('.mp4') !== -1 || url.indexOf('.mkv') !== -1 ? 'video' : null);
  return {
    name: name,
    title: quality,
    url: url,
    quality: quality,
    type: type,
    headers: { Referer: REFERER_SPOOF + '/', Origin: REFERER_SPOOF },
    provider: 'moviebox',
    behaviorHints: { bingeGroup: 'moviebox', notWebReady: false }
  };
}

function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function*() {
    var mediaType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
    var isTv = mediaType === 'tv';
    var se = isTv && season != null ? parseInt(season, 10) : null;
    var ep = isTv && episode != null ? parseInt(episode, 10) : null;

    var cacheKey = 'mb_' + tmdbId + '_' + mediaType + '_' + se + '_' + ep;
    var cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      var info = yield getTmdbInfo(tmdbId, mediaType);
      if (!info.title) return [];
      var subjects = yield searchMovieBox(info.title, mediaType);
      if (!subjects.length) return [];

      var seenUrls = {};
      var streams = [];

      for (var i = 0; i < subjects.length; i++) {
        var sub = subjects[i];
        try {
          var downloads = yield fetchDownloads(sub.id, sub.detailPath, se, ep);
          for (var j = 0; j < downloads.length; j++) {
            var dl = downloads[j];
            if (!dl.url || seenUrls[dl.url]) continue;
            seenUrls[dl.url] = true;
            var stream = buildStream(dl, sub.language);
            if (stream) streams.push(stream);
          }
        } catch (err) {
          if (typeof console !== 'undefined') console.error(TAG, 'Error subject ' + sub.id + ':', err.message);
        }
      }

      streams.sort(function(a, b) {
        var pa = parseInt(a.quality) || 0;
        var pb = parseInt(b.quality) || 0;
        return pb - pa;
      });

      if (streams.length) cacheSet(cacheKey, streams);
      return streams;

    } catch (err) {
      if (typeof console !== 'undefined') console.error(TAG, 'Fatal error:', err.message);
      return [];
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  globalThis.getStreams = getStreams;
}
