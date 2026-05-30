var VER = 'v7';

function getStreams(tmdbId, mediaType, season, episode) {
  var results = [];
  function add(name, url) {
    results.push({ name: '['+VER+'] '+name, title: name, url: url || 'https://example.com/r', quality: 'dbg' });
  }

  function t(desc, p) {
    return p.then(function(r) { add(desc+' OK'); return r; }).catch(function(e) { add(desc+' FAIL: '+e.message); throw e; });
  }

  try {
    add('start');

    return t('TMDB', fetch('https://api.themoviedb.org/3/movie/550?api_key=439c478a771f35c05022f9feabcca01c')).then(function(r) {
      return r.json();
    }).then(function(d) {
      add('title='+d.title);

      return t('MB-H5-search', fetch('https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ keyword: 'Fight Club', page: 1, perPage: 5, subjectType: 1 })
      }));
    }).then(function(r) {
      if (!r.ok) { add('MB-H5 status='+r.status); return results; }
      return r.json().then(function(j) {
        add('MB-H5 items='+(j.data&&j.data.items?j.data.items.length:0));
        return results;
      });
    }).catch(function(e) {
      add('DONE');
      return results;
    });
  } catch(e) {
    return Promise.resolve([{ name: '['+VER+'] CRASH: '+e.message, title: 'crash', url: 'https://example.com/c', quality: 'crash' }]);
  }
}

module.exports = { getStreams: getStreams };
