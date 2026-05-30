var LOG = [];
var API_BASE = 'https://h5-api.aoneroom.com';
var TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
var TMDB_BASE = 'https://api.themoviedb.org/3';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function L(m) { LOG.push(m); }

function jsonFetch(url, opts) {
  L('jf:'+url.substring(0,60));
  var h = { 'Accept': 'application/json', 'User-Agent': UA };
  if (opts && opts.headers) {
    for (var k in opts.headers) { if (Object.prototype.hasOwnProperty.call(opts.headers, k)) h[k] = opts.headers[k]; }
  }
  var o = { method: (opts && opts.method) || 'GET', headers: h };
  if (opts && opts.body) o.body = opts.body;
  return fetch(url, o).then(function(r) { L('jf status:'+r.status); return r.json(); });
}

function getStreams(tmdbId, type, season, episode) {
  LOG = [];
  L('start id='+tmdbId+' type='+type+' s='+season+' e='+episode);
  
  var mediaType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
  var se = mediaType === 'tv' && season != null ? parseInt(season, 10) : null;
  var ep = mediaType === 'tv' && episode != null ? parseInt(episode, 10) : null;
  L('mediaType='+mediaType+' se='+se+' ep='+ep);

  return jsonFetch(TMDB_BASE + '/' + mediaType + '/' + tmdbId + '?api_key=' + TMDB_KEY).then(function(data) {
    var title = mediaType === 'tv' ? data.name : data.title;
    L('tmdb title='+title);
    if (!title) return [];

    var subjType = mediaType === 'tv' ? 2 : 1;
    return jsonFetch(API_BASE + '/wefeed-h5api-bff/subject/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: title, page: 1, perPage: 24, subjectType: subjType })
    }).then(function(j) {
      var items = j.data && j.data.items ? j.data.items : [];
      L('search items='+items.length);
      for (var i = 0; i < items.length; i++) {
        L('  ['+i+'] id='+items[i].subjectId+' title='+(items[i].title||''));
      }

      // Match titles
      var escaped = (title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('^' + escaped + '(?: \\[([^\\]]+)\\])?$', 'i');
      var seen = {}, matched = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.subjectId || seen[it.subjectId]) continue;
        var clean = (it.title || '').replace(/\s+S\d+(?:-S?\d+)*$/i, '').trim();
        var m = clean.match(re);
        L('    clean='+clean+' match='+(m?'YES':'NO'));
        if (!m) continue;
        seen[it.subjectId] = true;
        matched.push({ id: it.subjectId, lang: m[1] || 'Original', path: it.detailPath || '' });
      }
      L('matched='+matched.length);
      if (!matched.length) return [];

      // Fetch downloads
      var seenUrl = {}, promises = [];
      for (var i = 0; i < matched.length; i++) {
        (function(m) {
          var qs = 'subjectId=' + m.id;
          if (se != null) qs += '&se=' + se;
          if (ep != null) qs += '&ep=' + ep;
          L('fetch dl id='+m.id);
          promises.push(jsonFetch(API_BASE + '/wefeed-h5api-bff/subject/download?' + qs, {
            headers: { 'Referer': 'https://fmoviesunblocked.net/' }
          }).then(function(j2) {
            var dls = j2.data && j2.data.downloads ? j2.data.downloads : [];
            L('dls count='+dls.length+' for id='+m.id);
            var out = [];
            for (var j = 0; j < dls.length; j++) {
              if (!dls[j].url || seenUrl[dls[j].url]) continue;
              seenUrl[dls[j].url] = true;
              var q = (dls[j].resolution || 720) + 'p';
              out.push({
                name: 'MovieBox' + (m.lang !== 'Original' ? ' ['+m.lang+']' : '') + ' | ' + q,
                title: q, url: dls[j].url, quality: q,
                headers: { 'Referer': 'https://fmoviesunblocked.net/' }
              });
            }
            return out;
          }));
        })(matched[i]);
      }

      return Promise.all(promises).then(function(rows) {
        var all = [];
        for (var i = 0; i < rows.length; i++) {
          for (var j = 0; j < rows[i].length; j++) all.push(rows[i][j]);
        }
        all.sort(function(a, b) { return (parseInt(b.quality)||0) - (parseInt(a.quality)||0); });
        L('total streams='+all.length);
        if (all.length === 0) {
          // Return log as streams for debugging
          for (var i = 0; i < LOG.length && i < 20; i++) {
            all.push({ name: 'LOG: '+LOG[i], title: 'log', url: 'https://example.com/l', quality: 'log' });
          }
        }
        return all;
      });
    });
  }).catch(function(e) {
    L('ERR: '+e.message);
    var fallback = [];
    for (var i = 0; i < LOG.length && i < 20; i++) {
      fallback.push({ name: 'LOG: '+LOG[i], title: 'log', url: 'https://example.com/l', quality: 'log' });
    }
    fallback.push({ name: 'ERR: '+e.message, title: 'err', url: 'https://example.com/e', quality: 'err' });
    return fallback;
  });
}

module.exports = { getStreams: getStreams };
