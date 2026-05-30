global.CryptoJS = require('crypto-js');
var { getStreams } = require('./providers/moviebox.js');

var TESTS = [
  { name: 'Fight Club (movie)', tmdbId: '550', type: 'movie', season: null, episode: null },
  { name: 'Breaking Bad S1E1 (tv)', tmdbId: '1396', type: 'series', season: '1', episode: '1' },
  { name: 'The Matrix (movie)', tmdbId: '603', type: 'movie', season: null, episode: null },
  { name: 'Interstellar (movie)', tmdbId: '157336', type: 'movie', season: null, episode: null },
  { name: 'Stranger Things S1E1 (tv)', tmdbId: '66732', type: 'series', season: '1', episode: '1' },
];

var passed = 0;
var failed = 0;

(async function() {
for (var t = 0; t < TESTS.length; t++) {
  var test = TESTS[t];
  console.log('\n' + '='.repeat(60));
  console.log('TEST: ' + test.name);
  console.log('='.repeat(60));

  try {
    var start = Date.now();
    var streams = await getStreams(test.tmdbId, test.type, test.season, test.episode);
    var elapsed = Date.now() - start;

    console.log('Results (' + elapsed + 'ms):');

    if (!streams || streams.length === 0) {
      console.log('No streams returned (content may not be available)');
      failed++;
      continue;
    }

    console.log('Streams: ' + streams.length);
    streams.forEach(function(s, i) {
      console.log('  [' + (i+1) + '] ' + s.name + ' | ' + s.quality + ' | ' + (s.url || '').substring(0, 70));
    });

    var s0 = streams[0];
    var checks = [
      { name: 'name', pass: !!s0.name },
      { name: 'title', pass: !!s0.title },
      { name: 'url', pass: !!s0.url && s0.url.indexOf('http') === 0 },
      { name: 'quality', pass: !!s0.quality },
      { name: 'provider', pass: s0.provider === 'moviebox' },
    ];

    var allOk = true;
    checks.forEach(function(c) {
      console.log('  ' + (c.pass ? 'OK' : 'FAIL') + ' ' + c.name);
      if (!c.pass) allOk = false;
    });

    if (allOk) { console.log('PASSED'); passed++; }
    else { console.log('FAILED'); failed++; }

  } catch (err) {
    console.error('ERROR: ' + err.message);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY: ' + passed + ' passed, ' + failed + ' failed of ' + TESTS.length);
console.log('='.repeat(60));
})();
