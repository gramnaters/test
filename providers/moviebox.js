var API_BASE = 'https://h5-api.aoneroom.com';
var TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
var TMDB_BASE = 'https://api.themoviedb.org/3';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function jsonFetch(url, opts) {
  var h = { 'Accept': 'application/json', 'User-Agent': UA };
  if (opts && opts.headers) {
    for (var k in opts.headers) { if (opts.headers.hasOwnProperty(k)) h[k] = opts.headers[k]; }
  }
  var o = { method: (opts && opts.method) || 'GET', headers: h };
  if (opts && opts.body) o.body = opts.body;
  return fetch(url, o).then(function(r) { return r.json(); });
}

function fetchTmdbInfo(tmdbId, mediaType) {
  var type = mediaType === 'tv' ? 'tv' : 'movie';
  return jsonFetch(TMDB_BASE + '/' + type + '/' + tmdbId + '?api_key=' + TMDB_KEY).then(function(data) {
    return {
      title: type === 'tv' ? data.name : data.title,
      year: (type === 'tv' ? data.first_air_date : data.release_date || '').substring(0, 4)
    };
  }).catch(function() { return null; });
}

function searchMovieBox(keyword, subjectType) {
  return jsonFetch(API_BASE + '/wefeed-h5api-bff/subject/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: keyword, page: 1, perPage: 24, subjectType: subjectType })
  }).then(function(j) {
    return j.data && j.data.items ? j.data.items : [];
  }).catch(function() { return []; });
}

function matchItems(items, tmdbTitle) {
  var escaped = (tmdbTitle || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('^' + escaped + '(?: \\[([^\\]]+)\\])?$', 'i');
  var seen = {}, matched = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it.subjectId || seen[it.subjectId]) continue;
    var clean = (it.title || '').replace(/\s+S\d+(?:-S?\d+)*$/i, '').trim();
    var m = clean.match(re);
    if (!m) continue;
    seen[it.subjectId] = true;
    matched.push({ id: it.subjectId, lang: m[1] || 'Original', path: it.detailPath || '' });
  }
  matched.sort(function(a, b) {
    if (a.lang === 'Original') return -1;
    if (b.lang === 'Original') return 1;
    return 0;
  });
  return matched;
}

function fetchDownloads(subjectId, path, season, episode) {
  var qs = 'subjectId=' + subjectId;
  if (season != null) qs += '&se=' + season;
  if (episode != null) qs += '&ep=' + episode;
  return jsonFetch(API_BASE + '/wefeed-h5api-bff/subject/download?' + qs, {
    headers: { 'Referer': 'https://fmoviesunblocked.net/spa/videoPlayPage/movies/' + path }
  }).then(function(j) {
    return j.data && j.data.downloads ? j.data.downloads : [];
  }).catch(function() { return []; });
}

function buildStream(dl, lang) {
  if (!dl || !dl.url) return null;
  var q = (dl.resolution || 720) + 'p';
  var name = 'MovieBox' + (lang && lang !== 'Original' ? ' [' + lang + ']' : '') + ' | ' + q;
  return { name: name, title: q, url: dl.url, quality: q, headers: { 'Referer': 'https://fmoviesunblocked.net/', 'Origin': 'https://fmoviesunblocked.net' } };
}

function getStreams(tmdbId, type, season, episode) {
  var mediaType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
  var se = mediaType === 'tv' && season != null ? parseInt(season, 10) : null;
  var ep = mediaType === 'tv' && episode != null ? parseInt(episode, 10) : null;

  return fetchTmdbInfo(tmdbId, mediaType).then(function(info) {
    if (!info || !info.title) return [];
    var subjType = mediaType === 'tv' ? 2 : 1;
    return searchMovieBox(info.title, subjType).then(function(items) {
      var matches = matchItems(items, info.title);
      if (!matches.length) return [];

      var seen = {}, promises = [];
      for (var i = 0; i < matches.length; i++) {
        (function(m) {
          promises.push(fetchDownloads(m.id, m.path, se, ep).then(function(dls) {
            var out = [];
            for (var j = 0; j < dls.length; j++) {
              if (!dls[j].url || seen[dls[j].url]) continue;
              seen[dls[j].url] = true;
              var s = buildStream(dls[j], m.lang);
              if (s) out.push(s);
            }
            return out;
          }));
        })(matches[i]);
      }

      return Promise.all(promises).then(function(rows) {
        var all = [];
        for (var i = 0; i < rows.length; i++) {
          for (var j = 0; j < rows[i].length; j++) all.push(rows[i][j]);
        }
        all.sort(function(a, b) { return (parseInt(b.quality)||0) - (parseInt(a.quality)||0); });
        return all;
      });
    });
  }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
