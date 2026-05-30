var CryptoJS = require('crypto-js');

var API_BASE = 'https://api.inmoviebox.com';
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
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
    var cu = q ? u.pathname+'?'+q : u.pathname;
    var bh='',bl='';
    if(body) { var bw=CryptoJS.enc.Utf8.parse(body); bh=md5(bw); bl=bw.sigBytes.toString(); }
    var canon=method.toUpperCase()+'\n'+accept+'\n'+ct+'\n'+bl+'\n'+ts+'\n'+bh+'\n'+cu;
    var sig=ts+'|2|'+hmac(SECRET,canon);
    var headers = {
        'Accept':accept,'Content-Type':ct,'x-client-token':token,'x-tr-signature':sig,
        'User-Agent':UA,'x-client-info':INFO,'x-client-status':'0'
    };
    var opts={method:method,headers:headers};
    if(body) opts.body=body;
    return fetch(url,opts).then(function(r){return r.json();});
}

// Step 1: TMDB for Breaking Bad
console.log('=== TMDB: Breaking Bad ===');
fetch('https://api.themoviedb.org/3/tv/1396?api_key='+TMDB_KEY)
  .then(function(r){return r.json()})
  .then(function(d) {
    console.log('Title:', d.name || d.original_name);
    console.log('Year:', (d.first_air_date||'').substring(0,4));
    console.log('Original title:', d.original_name);

    // Step 2: Search
    console.log('\n=== Search: Breaking Bad ===');
    return authFetch('POST', API_BASE+'/wefeed-mobile-bff/subject-api/search/v2',
        '{"page":1,"perPage":10,"keyword":"Breaking Bad"}').then(function(j) {
        if (j && j.data && j.data.results) {
            j.data.results.forEach(function(g) {
                console.log('Group topic:', g.topicType);
                if (g.subjects) {
                    g.subjects.forEach(function(s) {
                        console.log('  subject:', s.subjectId, 'type:', s.subjectType, 'title:', s.title, 'year:', s.releaseDate);
                    });
                }
            });
            
            // Find TV type (subjectType 2)
            var tvSub = null;
            j.data.results.forEach(function(g) {
                if (g.subjects) {
                    g.subjects.forEach(function(s) {
                        if (s.subjectType === 2) tvSub = s;
                    });
                }
            });
            
            if (tvSub) {
                console.log('\n=== Best TV match:', tvSub.subjectId, tvSub.title);
                return authFetch('GET', API_BASE+'/wefeed-mobile-bff/subject-api/get?subjectId='+tvSub.subjectId).then(function(j2) {
                    console.log('Has resource:', j2.data ? j2.data.hasResource : 'N/A');
                    console.log('Data keys:', j2.data ? Object.keys(j2.data).join(', ') : 'N/A');
                    console.log('season field:', JSON.stringify(j2.data ? j2.data.season : null));
                    console.log('seNum:', j2.data ? j2.data.seNum : null);
                    
                    if (j2.data && j2.data.dubs) {
                        console.log('Dubs found:', j2.data.dubs.length);
                        j2.data.dubs.forEach(function(d,i){
                            console.log('['+i+'] id='+d.subjectId+' lang='+d.lanName+' orig='+d.original);
                        });
                        
                        // Get each dub's details
                        var dubPromises = j2.data.dubs.map(function(dub) {
                            return authFetch('GET', API_BASE+'/wefeed-mobile-bff/subject-api/get?subjectId='+dub.subjectId).then(function(j3) {
                                if (j3 && j3.data) {
                                    console.log('\nDub "'+dub.lanName+'" resourceDetectors:', j3.data.resourceDetectors ? j3.data.resourceDetectors.length : 0);
                                    if (j3.data.resourceDetectors) {
                                        j3.data.resourceDetectors.forEach(function(rd, ri) {
                                            console.log('  RD['+ri+'] totalEpisode='+rd.totalEpisode);
                                            console.log('  downloadUrl=', (rd.downloadUrl||'').substring(0,80));
                                            console.log('  resourceLink=', (rd.resourceLink||'').substring(0,80));
                                            console.log('  source=', rd.source);
                                            console.log('  subjectId=', rd.subjectId);
                                            console.log('  type=', rd.type);
                                            console.log('  RD keys:', Object.keys(rd).join(', '));
                                            if (rd.resolutionList) {
                                                console.log('  resolutionList length:', rd.resolutionList.length);
                                                if (rd.resolutionList.length > 0) {
                                                    rd.resolutionList.forEach(function(rl, rli) {
                                                        if (rli < 5) {
                                                            console.log('    RL['+rli+'] se='+rl.se+' ep='+rl.episode+' res='+rl.resolution+' url='+(rl.resourceLink||'').substring(0,60));
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                    // Also check if there's a different way to get episodes
                                    if (j3.data && j3.data.playUrl) console.log('  playUrl:', JSON.stringify(j3.data.playUrl));
                                    if (j3.data && j3.data.detailUrl) console.log('  detailUrl:', j3.data.detailUrl);
                                }
                            });
                        });
                        return Promise.all(dubPromises);
                    }
                });
            } else {
                console.log('No TV match found');
            }
        } else {
            console.log('No search results');
            console.log('Response:', JSON.stringify(j).substring(0,500));
        }
    });
  }).catch(function(e) {
    console.error('ERROR:', e.message, e.stack);
  });
