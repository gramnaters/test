function getStreams(tmdbId, mediaType, season, episode) {
  try {
    var debug = [];
    function d(m) { debug.push({ name: 'DBG: '+m, title: 'dbg', url: 'https://example.com/d', quality: 'dbg' }); }
    d('called id='+tmdbId+' type='+mediaType);

    d('fetch='+(typeof fetch));
    d('Promise='+(typeof Promise));
    d('module='+(typeof module));

    if (typeof fetch === 'undefined') {
      return Promise.resolve(debug);
    }

    d('fetch exists, calling httpbin');
    return fetch('https://httpbin.org/get').then(function(r) {
      d('httpbin status='+r.status);
      return Promise.resolve(debug);
    }).catch(function(e) {
      d('fetch err: '+e.message);
      return Promise.resolve(debug);
    });
  } catch(e) {
    return Promise.resolve([{ name: 'CRASH: '+e.message, title: 'crash', url: 'https://example.com/c', quality: 'crash' }]);
  }
}

module.exports = { getStreams: getStreams };
