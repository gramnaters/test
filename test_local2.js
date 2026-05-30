var CryptoJS = require('crypto-js');

var API_BASE = 'https://api.inmoviebox.com';
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
var TMDB_URL = 'https://api.themoviedb.org/3';

var KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
var ALT_B64 = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";

var SECRET = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64).toString(CryptoJS.enc.Utf8)
);

function md5(input) { return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex); }
function hmacMd5(key, data) { return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64); }

function genToken(ts) {
    var t = (ts || Date.now()).toString();
    return t + ',' + md5(t.split('').reverse().join(''));
}

function buildCanonical(method, accept, ct, url, body, ts) {
    var path = "", query = "";
    try {
        var u = new URL(url);
        path = u.pathname;
        var keys = Array.from(u.searchParams.keys()).sort();
        if (keys.length > 0) {
            query = keys.map(function(k) {
                return u.searchParams.getAll(k).map(function(v) { return k + '=' + v; }).join('&');
            }).join('&');
        }
    } catch (e) { console.error("URL error:", e.message); }
    var cu = query ? path + '?' + query : path;
    var bh = "", bl = "";
    if (body) {
        var bw = CryptoJS.enc.Utf8.parse(body);
        bh = md5(bw);
        bl = bw.sigBytes.toString();
    }
    return method.toUpperCase() + '\n' + (accept||'') + '\n' + (ct||'') + '\n' + bl + '\n' + ts + '\n' + bh + '\n' + cu;
}

function genSig(method, accept, ct, url, body, ts) {
    var canon = buildCanonical(method, accept, ct, url, body, ts);
    console.log('Canonical string:');
    console.log(JSON.stringify(canon));
    var sig = hmacMd5(SECRET, canon);
    return ts + '|2|' + sig;
}

var UA = 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)';
var INFO = '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}';

function authFetch(method, url, body) {
    var ts = Date.now();
    var ct = 'application/json';
    var accept = 'application/json';
    var token = genToken(ts);
    var sig = genSig(method, accept, ct, url, body, ts);
    var headers = {
        'Accept': accept,
        'Content-Type': ct,
        'x-client-token': token,
        'x-tr-signature': sig,
        'User-Agent': UA,
        'x-client-info': INFO,
        'x-client-status': '0'
    };
    var opts = { method: method, headers: headers };
    if (body) opts.body = body;
    return fetch(url, opts).then(function(r) {
        console.log('Response status:', r.status, r.statusText);
        console.log('Response headers:', JSON.stringify(Array.from(r.headers.entries())));
        return r.text();
    }).then(function(t) {
        console.log('Body (first 800):', t.substring(0, 800));
        return t;
    });
}

// Step 1: TMDB
console.log('=== STEP 1: TMDB lookup ===');
fetch(TMDB_URL + '/movie/550?api_key=' + TMDB_KEY)
  .then(function(r) { return r.json(); })
  .then(function(d) {
    console.log('Title:', d.title, 'Year:', (d.release_date||'').substring(0,4));
    
    // Step 2: Search MovieBox
    console.log('\n=== STEP 2: Search MovieBox ===');
    var searchUrl = API_BASE + '/wefeed-mobile-bff/subject-api/search/v2';
    var searchBody = '{"page":1,"perPage":10,"keyword":"Fight Club"}';
    return authFetch('POST', searchUrl, searchBody);
  })
  .then(function() {
    // Step 3: Subject get with real ID
    console.log('\n=== STEP 3: Subject get (real ID) ===');
    var realId = '8137378744555162280';
    var subUrl = API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + realId;
    return authFetch('GET', subUrl, null);
  })
  .then(function() {
    // Step 4: Play info
    console.log('\n=== STEP 4: Play info ===');
    var realId = '8137378744555162280';
    // Try different Accept/Content-Type combos
    // Get full subject data to see dubs
    console.log('\n--- Full subject get response ---');
    var subUrl2 = API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + realId;
    var ts1 = Date.now();
    var sig1 = genSig('GET', 'application/json', 'application/json', subUrl2, null, ts1);
    var h1 = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-client-token': genToken(ts1),
        'x-tr-signature': sig1,
        'User-Agent': UA,
        'x-client-info': INFO,
        'x-client-status': '0'
    };
    return fetch(subUrl2, { method: 'GET', headers: h1 }).then(function(r) { return r.json(); }).then(function(j) {
        var d = j.data || {};
        console.log('Full subject data (data keys):', Object.keys(d).join(', '));
        console.log('hasResource:', d.hasResource);
        console.log('playUrl:', d.playUrl);
        console.log('detailUrl:', d.detailUrl);
        console.log('season:', JSON.stringify(d.season));
        console.log('isCam:', d.isCam);
        console.log('preVideoAddress:', JSON.stringify(d.preVideoAddress));
        console.log('resourceDetectors:', JSON.stringify(d.resourceDetectors).substring(0, 500));
        console.log('ops:', JSON.stringify(d.ops).substring(0, 500));
        console.log('subtitles:', JSON.stringify(d.subtitles).substring(0, 300));
        
        if (d.dubs) {
            console.log('Dubs:');
            d.dubs.forEach(function(dub, i) {
                console.log('  [' + i + '] subjectId=' + dub.subjectId + ' lanName=' + dub.lanName);
            });
            
            // Try downloading with resource endpoint if hasResource
            if (d.hasResource && d.playUrl) {
                console.log('\n--- Trying playUrl directly ---');
                console.log('playUrl value:', d.playUrl);
            }
            
            // Try play-info for original audio
            var origId = d.dubs[0].subjectId;
            console.log('\n--- Play info for Original Audio: ' + origId + ' ---');
            var playUrl2 = API_BASE + '/wefeed-mobile-bff/subject-api/play-info?subjectId=' + origId;
            var ts2 = Date.now();
            var sig2 = genSig('GET', 'application/json', 'application/json', playUrl2, null, ts2);
            var h2 = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-client-token': genToken(ts2),
                'x-tr-signature': sig2,
                'User-Agent': UA,
                'x-client-info': INFO,
                'x-client-status': '0'
            };
            return fetch(playUrl2, { method: 'GET', headers: h2 }).then(function(r) {
                console.log('Status:', r.status);
                return r.text();
            }).then(function(t) { console.log('Body(1000):', t.substring(0,1000)); });
        } else {
            console.log('No dubs found.');
        }
    });
  })
  .catch(function(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  });
