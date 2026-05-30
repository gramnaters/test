function getStreams(tmdbId, mediaType, season, episode) {
  var results = [];

  function log(msg) {
    results.push({ name: 'DEBUG: ' + msg, title: 'debug', url: 'https://example.com/debug', quality: 'debug' });
  }

  log('getStreams called: id=' + tmdbId + ' type=' + mediaType + ' s=' + season + ' e=' + episode);

  // Test 1: Simple fetch to a reliable URL
  return fetch('https://httpbin.org/get', { method: 'GET' }).then(function(r) {
    log('httpbin status: ' + r.status);
    // Test 2: TMDB API
    return fetch('https://api.themoviedb.org/3/movie/550?api_key=439c478a771f35c05022f9feabcca01c', { method: 'GET' });
  }).then(function(r) {
    log('TMDB status: ' + r.status);
    return r.json();
  }).then(function(d) {
    log('TMDB title: ' + d.title);
    // Test 3: MovieBox search (POST)
    return fetch('https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Client-Token': 'test', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ keyword: 'Fight Club', page: 1, perPage: 5, subjectType: 1 })
    });
  }).then(function(r) {
    log('MovieBox search status: ' + r.status);
    if (r.ok) return r.json().then(function(j) {
      log('MovieBox search OK, items: ' + (j.data ? (j.data.items ? j.data.items.length : 'no items') : 'no data'));
    });
    return r.text().then(function(t) { log('MovieBox error: ' + t.substring(0, 200)); });
  }).then(function() {
    return results.length > 0 ? results : [];
  }).catch(function(e) {
    results.push({ name: 'ERROR: ' + e.message, title: 'error', url: 'https://example.com/error', quality: 'error' });
    return results;
  });
}

module.exports = { getStreams: getStreams };
