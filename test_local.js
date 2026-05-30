var fs = require('fs');
var CryptoJS = require('crypto-js');

var code = fs.readFileSync(__dirname + '/providers/moviebox.js', 'utf8');
var API_BASE = 'https://api.inmoviebox.com';
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';

// Test provider without debug patches first, using verbose logger
var logger = {
  log: function() { console.log.apply(console, arguments); },
  warn: function() { console.warn.apply(console, arguments); },
  error: function() { console.error.apply(console, arguments); }
};

var fn = new Function('module', 'exports', 'require', 'axios', 'fetch', 'CryptoJS', 'cheerio', 'logger', 'params', 'PRIMARY_KEY', 'TMDB_API_KEY', 'SCRAPER_SETTINGS', 'SCRAPER_ID', code);
var mod = { exports: {} };
fn(mod, mod.exports, require, null, global.fetch, CryptoJS, null, logger, {}, null, null, null, 'moviebox');

console.log('Calling getStreams(550, movie, 1, 1)...');
mod.exports.getStreams('550', 'movie', 1, 1).then(function(streams) {
  console.log('\n=== FINAL RESULTS ===');
  console.log('STREAMS FOUND:', streams.length);
  if (streams.length > 0) {
    streams.forEach(function(s, i) {
      console.log('[' + i + '] name=' + s.name);
      console.log('    url=' + (s.url || '').substring(0, 120));
      console.log('    quality=' + s.quality);
    });
  } else {
    console.log('No streams returned');
  }
}).catch(function(e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
});
