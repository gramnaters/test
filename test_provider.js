var fs = require('fs');
var CryptoJS = require('crypto-js');

var code = fs.readFileSync(__dirname + '/providers/moviebox.js', 'utf8');
var mod = { exports: {} };
var logger = {
    log: function() { console.log.apply(console, arguments); },
    warn: function() { console.warn.apply(console, arguments); },
    error: function() { console.error.apply(console, arguments); }
};

var fn = new Function('module', 'exports', 'require', 'axios', 'fetch', 'CryptoJS', 'cheerio', 'logger', 'params', 'PRIMARY_KEY', 'TMDB_API_KEY', 'SCRAPER_SETTINGS', 'SCRAPER_ID', code);
fn(mod, mod.exports, require, null, global.fetch, CryptoJS, null, logger, {}, null, null, null, 'moviebox');

console.log('=== Test movie: Fight Club (550) ===');
mod.exports.getStreams('550', 'movie', 1, 1).then(function(streams) {
    console.log('STREAMS:', streams.length);
    streams.forEach(function(s, i) {
        console.log('[' + i + '] ' + s.name + ' | ' + s.quality + ' | ' + (s.url || '').substring(0, 80));
    });
    if (streams.length === 0) console.log('NO STREAMS');

    console.log('\n=== Test TV show: Breaking Bad S1E1 (1396) ===');
    return mod.exports.getStreams('1396', 'tv', 1, 1);
}).then(function(streams2) {
    console.log('TV STREAMS:', streams2.length);
    streams2.forEach(function(s, i) {
        console.log('[' + i + '] ' + s.name + ' | ' + s.quality + ' | ' + (s.url || '').substring(0, 80));
    });
    if (streams2.length === 0) console.log('NO STREAMS');
}).catch(function(e) {
    console.error('ERROR:', e.message, e.stack);
});
