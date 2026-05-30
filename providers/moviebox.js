var VER = 'v6';

function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof fetch === 'undefined') {
      return Promise.resolve([{ name: '['+VER+'] NO_FETCH - fetch is undefined in this runtime', title: 'fetch unavailable', url: 'https://example.com/nope', quality: 'error' }]);
    }
    return fetch('https://httpbin.org/get').then(function(r) {
      return [{ name: '['+VER+'] FETCH_OK status=' + r.status, title: 'fetch works', url: 'https://example.com/ok', quality: 'ok' }];
    }).catch(function(e) {
      return [{ name: '['+VER+'] FETCH_ERR: ' + e.message, title: 'fetch error', url: 'https://example.com/err', quality: 'error' }];
    });
  } catch(e) {
    return Promise.resolve([{ name: '['+VER+'] CRASH: ' + e.message, title: 'crash', url: 'https://example.com/c', quality: 'crash' }]);
  }
}

module.exports = { getStreams: getStreams };
