var CryptoJS = require('crypto-js');

var API_BASE = 'https://api.inmoviebox.com';
var KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
var SECRET = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64).toString(CryptoJS.enc.Utf8)
);
var UA = 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)';
var INFO = '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}';

function md5(i) { return CryptoJS.MD5(i).toString(CryptoJS.enc.Hex); }
function hmac(k,d) { return CryptoJS.HmacMD5(d,k).toString(CryptoJS.enc.Base64); }

function authFetch(method, url, body) {
    var ts = Date.now();
    var ct = 'application/json';
    var accept = 'application/json';
    var t = ts.toString();
    var token = t + ',' + md5(t.split('').reverse().join(''));
    var u = new URL(url);
    var keys = Array.from(u.searchParams.keys()).sort();
    var q = keys.length > 0 ? keys.map(function(k) { return u.searchParams.getAll(k).map(function(v) { return k+'='+v; }).join('&'); }).join('&') : '';
    var cu = q ? u.pathname + '?' + q : u.pathname;
    var bh = '', bl = '';
    if (body) { var bw=CryptoJS.enc.Utf8.parse(body); bh=md5(bw); bl=bw.sigBytes.toString(); }
    var canon = method.toUpperCase()+'\n'+accept+'\n'+ct+'\n'+bl+'\n'+ts+'\n'+bh+'\n'+cu;
    var sig = ts+'|2|'+hmac(SECRET, canon);
    var headers = {
        'Accept': accept, 'Content-Type': ct, 'x-client-token': token, 'x-tr-signature': sig,
        'User-Agent': UA, 'x-client-info': INFO, 'x-client-status': '0'
    };
    var opts = { method: method, headers: headers };
    if (body) opts.body = body;
    return fetch(url, opts).then(function(r) { return r.json(); });
}

var realId = '8137378744555162280';

// Fetch subject details
authFetch('GET', API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + realId).then(function(j) {
    var d = j.data;
    console.log('=== SUBJECT DATA ===');
    console.log('title:', d.title);
    console.log('hasResource:', d.hasResource);
    console.log('resourceDetectors:', JSON.stringify(d.resourceDetectors, null, 2).substring(0, 2000));
    console.log('playUrl:', JSON.stringify(d.playUrl));
    console.log('ops:', JSON.stringify(d.ops, null, 2).substring(0, 1000));
    console.log('subtitles:', JSON.stringify(d.subtitles, null, 2).substring(0, 500));
    console.log('preVideoAddress:', JSON.stringify(d.preVideoAddress));
    console.log('dubs:', JSON.stringify(d.dubs));
    console.log('hasSource:', d.hasSource);
    console.log('all keys:', Object.keys(d).join(', '));
    
    // Try fetching the first dub (original audio)
    var origId = d.dubs[0].subjectId;
    console.log('\n=== ORIGINAL DUB DATA ===');
    return authFetch('GET', API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + origId).then(function(j2) {
        var d2 = j2.data;
        console.log('title:', d2.title);
        console.log('hasResource:', d2.hasResource);
        console.log('resourceDetectors:', JSON.stringify(d2.resourceDetectors, null, 2).substring(0, 2000));
        console.log('playUrl:', JSON.stringify(d2.playUrl));
        console.log('ops:', JSON.stringify(d2.ops, null, 2).substring(0, 1000));
        console.log('all keys:', Object.keys(d2).join(', '));
        
        // Try play-info endpoint
        console.log('\n=== PLAY-INFO ORIGINAL DUB ===');
        return authFetch('GET', API_BASE + '/wefeed-mobile-bff/subject-api/play-info?subjectId=' + origId).then(function(j3) {
            console.log('play-info response:', JSON.stringify(j3, null, 2).substring(0, 2000));
            
            // Try with se/ep
            console.log('\n=== PLAY-INFO WITH SE/EP ===');
            return authFetch('GET', API_BASE + '/wefeed-mobile-bff/subject-api/play-info?subjectId=' + origId + '&se=0&ep=0').then(function(j4) {
                console.log('play-info response:', JSON.stringify(j4, null, 2).substring(0, 2000));
            });
        });
    });
}).catch(function(e) {
    console.error('ERROR:', e.message, e.stack);
});
