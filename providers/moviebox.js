// MovieBox Scraper for Nuvio
// Uses api.inmoviebox.com with HMAC-MD5 auth

var API_BASE = "https://api.inmoviebox.com";
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
var TMDB_URL = 'https://api.themoviedb.org/3';

var KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
var ALT_B64 = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";

var SECRET = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64).toString(CryptoJS.enc.Utf8)
);
var ALT_SECRET = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(ALT_B64).toString(CryptoJS.enc.Utf8)
);

var HEADERS = {
    'User-Agent': 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)',
    'Connection': 'keep-alive',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-client-info': '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}',
    'x-client-status': '0'
};

function md5(input) {
    return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

function hmacMd5(key, data) {
    return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64);
}

function genClientToken(ts) {
    var t = (ts || Date.now()).toString();
    var rev = t.split('').reverse().join('');
    var hash = md5(rev);
    return t + ',' + hash;
}

function buildCanonical(method, accept, ct, url, body, ts) {
    var path = "";
    var query = "";
    try {
        var u = new URL(url);
        path = u.pathname;
        var keys = Array.from(u.searchParams.keys()).sort();
        if (keys.length > 0) {
            query = keys.map(function(k) {
                return u.searchParams.getAll(k).map(function(v) { return k + '=' + v; }).join('&');
            }).join('&');
        }
    } catch (e) {
        console.error("URL parse error:", e.message);
    }
    var canonicalUrl = query ? path + '?' + query : path;
    var bodyHash = "";
    var bodyLen = "";
    if (body) {
        var bw = CryptoJS.enc.Utf8.parse(body);
        bodyHash = md5(bw);
        bodyLen = bw.sigBytes.toString();
    }
    return method.toUpperCase() + '\n' +
        (accept || '') + '\n' +
        (ct || '') + '\n' +
        bodyLen + '\n' +
        ts + '\n' +
        bodyHash + '\n' +
        canonicalUrl;
}

function genSignature(method, accept, ct, url, body, altKey, customTs) {
    var ts = customTs || Date.now();
    var canon = buildCanonical(method, accept, ct, url, body, ts);
    var secret = altKey ? ALT_SECRET : SECRET;
    var sig = hmacMd5(secret, canon);
    return ts + '|2|' + sig;
}

function apiRequest(method, url, body, extraHeaders) {
    var ts = Date.now();
    var token = genClientToken(ts);
    var ct = (extraHeaders && extraHeaders['Content-Type']) || 'application/json';
    var accept = (extraHeaders && extraHeaders['Accept']) || 'application/json';
    var sig = genSignature(method, accept, ct, url, body, false, ts);

    var headers = {
        'Accept': accept,
        'Content-Type': ct,
        'x-client-token': token,
        'x-tr-signature': sig,
        'User-Agent': HEADERS['User-Agent'],
        'x-client-info': HEADERS['x-client-info'],
        'x-client-status': HEADERS['x-client-status']
    };
    if (extraHeaders) {
        for (var k in extraHeaders) headers[k] = extraHeaders[k];
    }

    var opts = { method: method, headers: headers };
    if (body) opts.body = body;

    return fetch(url, opts).then(function(res) {
        return res.text().then(function(text) {
            if (!res.ok) return null;
            try { return JSON.parse(text); } catch(e) { return text; }
        });
    }).catch(function(err) {
        console.error('API error:', err.message);
        return null;
    });
}

function getTmdb(tmdbId, type) {
    var mediaType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    var url = TMDB_URL + '/' + mediaType + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&append_to_response=external_ids';
    return fetch(url).then(function(r) { return r.json(); }).then(function(d) {
        return {
            title: mediaType === 'movie' ? (d.title || d.original_title) : (d.name || d.original_name),
            year: (d.release_date || d.first_air_date || '').substring(0, 4),
            imdbId: d.external_ids ? d.external_ids.imdb_id : null,
            originalTitle: d.original_title || d.original_name,
            mediaType: mediaType
        };
    }).catch(function() { return null; });
}

function normTitle(s) {
    if (!s) return "";
    return s.replace(/\[.*?\]/g, " ")
        .replace(/\(.*?\)/g, " ")
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ")
        .trim().toLowerCase()
        .replace(/:/g, " ")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ");
}

function searchBox(query) {
    var url = API_BASE + '/wefeed-mobile-bff/subject-api/search/v2';
    var body = '{"page":1,"perPage":10,"keyword":"' + query + '"}';
    return apiRequest('POST', url, body).then(function(res) {
        if (res && res.data && res.data.results) {
            var all = [];
            res.data.results.forEach(function(g) {
                if (g.subjects) all = all.concat(g.subjects);
            });
            return all;
        }
        return [];
    });
}

function findMatch(subjects, tmdbTitle, tmdbYear, mediaType) {
    var norm = normTitle(tmdbTitle);
    var target = mediaType === 'movie' ? 1 : 2;
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < subjects.length; i++) {
        var sub = subjects[i];
        if (sub.subjectType !== target) continue;
        var nt = normTitle(sub.title);
        var yr = sub.year || (sub.releaseDate ? sub.releaseDate.substring(0, 4) : null);
        var score = 0;
        if (nt === norm) score += 50;
        else if (nt.indexOf(norm) >= 0 || norm.indexOf(nt) >= 0) score += 15;
        if (tmdbYear && yr && tmdbYear == yr) score += 35;
        if (score > bestScore) { bestScore = score; best = sub; }
    }
    return bestScore >= 40 ? best : null;
}

function getLinks(subjectId, season, episode, mediaTitle, mediaType) {
    var subUrl = API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + subjectId;

    function fmtQual(v) {
        if (!v) return 'Auto';
        var s = String(v).trim();
        if (/\d{3,4}p$/i.test(s)) return s;
        var m = s.match(/(\d{3,4})/);
        return m ? m[1] + 'p' : s;
    }

    function fmtType(url) {
        var u = String(url || '').toLowerCase();
        if (u.indexOf('.mpd') >= 0) return 'DASH';
        if (u.indexOf('.m3u8') >= 0) return 'HLS';
        if (u.indexOf('.mp4') >= 0) return 'MP4';
        if (u.indexOf('.mkv') >= 0) return 'MKV';
        return 'VIDEO';
    }

    function qRank(url) {
        var u = String(url || '').toLowerCase();
        if (u.indexOf('.mpd') >= 0) return 3;
        if (u.indexOf('.m3u8') >= 0) return 2;
        if (u.indexOf('.mp4') >= 0 || u.indexOf('.mkv') >= 0) return 1;
        return 0;
    }

    function fmtTitle(title, s, e, mt) {
        if (mt === 'tv' && s > 0 && e > 0) {
            var sp = String(s);
            if (sp.length < 2) sp = '0' + sp;
            var ep = String(e);
            if (ep.length < 2) ep = '0' + ep;
            return title + ' S' + sp + 'E' + ep;
        }
        return title || 'Stream';
    }

    return apiRequest('GET', subUrl).then(function(subRes) {
        if (!subRes || !subRes.data) return [];

        var ids = [];
        var origLang = "Original";
        var dubs = subRes.data.dubs;
        if (Array.isArray(dubs)) {
            dubs.forEach(function(d) {
                if (d.subjectId == subjectId) {
                    origLang = d.lanName || "Original";
                } else {
                    ids.push({ id: d.subjectId, lang: d.lanName });
                }
            });
        }
        ids.unshift({ id: subjectId, lang: origLang });

        var ps = ids.map(function(item) {
            var pu = API_BASE + '/wefeed-mobile-bff/subject-api/play-info?subjectId=' + item.id + '&se=' + season + '&ep=' + episode;
            return apiRequest('GET', pu).then(function(pr) {
                var sts = [];
                if (pr && pr.data && pr.data.streams) {
                    pr.data.streams.forEach(function(st) {
                        if (st.url) {
                            var qf = st.resolutions || st.quality || 'Auto';
                            var cands = [];
                            if (Array.isArray(qf)) cands = qf;
                            else if (typeof qf === 'string' && qf.indexOf(',') >= 0) cands = qf.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                            else cands = [qf];

                            var maxQ = 0;
                            cands.forEach(function(v) {
                                var m = String(v).match(/(\d{3,4})/);
                                if (m) { var n = parseInt(m[1], 10); if (n > maxQ) maxQ = n; }
                            });
                            var qual = maxQ ? maxQ + 'p' : fmtQual(cands[0]);
                            var ft = fmtType(st.url);

                            var hdrs = { "Referer": API_BASE, "User-Agent": HEADERS['User-Agent'] };
                            if (st.signCookie) hdrs["Cookie"] = st.signCookie;

                            sts.push({
                                name: 'MovieBox (' + item.lang + ') ' + qual + ' [' + ft + ']',
                                title: fmtTitle(mediaTitle, season, episode, mediaType),
                                url: st.url,
                                quality: qual,
                                headers: hdrs
                            });
                        }
                    });
                }
                return sts;
            });
        });

        return Promise.all(ps).then(function(res) {
            var flat = [];
            res.forEach(function(a) { flat = flat.concat(a); });
            flat.sort(function(a, b) {
                var qa = parseInt(a.quality) || 0;
                var qb = parseInt(b.quality) || 0;
                if (qb !== qa) return qb - qa;
                return qRank(b.url) - qRank(a.url);
            });
            return flat;
        });
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (seasonNum == null) seasonNum = 1;
    if (episodeNum == null) episodeNum = 1;

    return getTmdb(tmdbId, mediaType).then(function(details) {
        if (!details) return [];

        return searchBox(details.title).then(function(subjects) {
            var match = findMatch(subjects, details.title, details.year, details.mediaType);

            if (!match && details.originalTitle && details.originalTitle !== details.title) {
                return searchBox(details.originalTitle).then(function(subs2) {
                    var m2 = findMatch(subs2, details.originalTitle, details.year, details.mediaType);
                    if (m2) {
                        var s = details.mediaType === 'tv' ? seasonNum : 0;
                        var e = details.mediaType === 'tv' ? episodeNum : 0;
                        return getLinks(m2.subjectId, s, e, details.title, details.mediaType);
                    }
                    return [];
                });
            }

            if (match) {
                var s = details.mediaType === 'tv' ? seasonNum : 0;
                var e = details.mediaType === 'tv' ? episodeNum : 0;
                return getLinks(match.subjectId, s, e, details.title, details.mediaType);
            }
            return [];
        });
    });
}

module.exports = { getStreams: getStreams };
