// MovieBox Scraper for Nuvio
// Uses api.inmoviebox.com with HMAC-MD5 auth
// Stream URLs come from resourceDetectors in /get response

var API_BASE = "https://api.inmoviebox.com";
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
var TMDB_URL = 'https://api.themoviedb.org/3';

var KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
var SECRET = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64).toString(CryptoJS.enc.Utf8)
);

var UA = 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)';
var INFO = '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}';

function md5(i) { return CryptoJS.MD5(i).toString(CryptoJS.enc.Hex); }
function hmac(k, d) { return CryptoJS.HmacMD5(d, k).toString(CryptoJS.enc.Base64); }

function authFetch(method, url, body) {
    var ts = Date.now();
    var ct = 'application/json';
    var accept = 'application/json';
    var t = ts.toString();
    var token = t + ',' + md5(t.split('').reverse().join(''));
    var u = new URL(url);
    var keys = Array.from(u.searchParams.keys()).sort();
    var q = '';
    if (keys.length > 0) {
        q = keys.map(function(k) {
            return u.searchParams.getAll(k).map(function(v) { return k + '=' + v; }).join('&');
        }).join('&');
    }
    var cu = q ? u.pathname + '?' + q : u.pathname;
    var bh = '';
    var bl = '';
    if (body) {
        var bw = CryptoJS.enc.Utf8.parse(body);
        bh = md5(bw);
        bl = bw.sigBytes.toString();
    }
    var canon = method.toUpperCase() + '\n' + accept + '\n' + ct + '\n' + bl + '\n' + ts + '\n' + bh + '\n' + cu;
    var sig = ts + '|2|' + hmac(SECRET, canon);
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
        return r.text().then(function(text) {
            if (!r.ok) return null;
            try { return JSON.parse(text); } catch(e) { return text; }
        });
    }).catch(function() { return null; });
}

function getTmdb(tmdbId, type) {
    var mediaType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    var url = TMDB_URL + '/' + mediaType + '/' + tmdbId + '?api_key=' + TMDB_KEY;
    return fetch(url).then(function(r) { return r.json(); }).then(function(d) {
        return {
            title: mediaType === 'movie' ? (d.title || d.original_title) : (d.name || d.original_name),
            year: (d.release_date || d.first_air_date || '').substring(0, 4),
            originalTitle: d.original_title || d.original_name,
            mediaType: mediaType
        };
    }).catch(function() { return null; });
}

function normTitle(s) {
    if (!s) return '';
    return s.replace(/\[.*?\]/g, ' ')
        .replace(/\(.*?\)/g, ' ')
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, ' ')
        .trim().toLowerCase()
        .replace(/:/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ');
}

function searchBox(query) {
    var url = API_BASE + '/wefeed-mobile-bff/subject-api/search/v2';
    var body = '{"page":1,"perPage":10,"keyword":"' + query.replace(/"/g, '\\"') + '"}';
    return authFetch('POST', url, body).then(function(res) {
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

function extractDubs(data) {
    var result = [];
    if (data && data.dubs) {
        data.dubs.forEach(function(d) {
            result.push({ id: d.subjectId, lang: d.lanName });
        });
    }
    if (result.length === 0 && data && data.subjectId) {
        result.push({ id: data.subjectId, lang: 'Original' });
    }
    return result;
}

function extractStreams(data, lang, mediaTitle, season, episode, mediaType) {
    var streams = [];
    if (!data || !data.resourceDetectors || !Array.isArray(data.resourceDetectors)) return streams;

    data.resourceDetectors.forEach(function(detector) {
        if (!detector.resolutionList || !Array.isArray(detector.resolutionList)) return;
        detector.resolutionList.forEach(function(res) {
            var ep = res.episode || res.ep || 0;
            var se = res.se || 0;
            if (mediaType === 'tv' && season != null && episode != null) {
                if (se != season || ep != episode) return;
            }
            if (!res.resourceLink) return;
            var qual = res.resolution ? res.resolution + 'p' : 'Auto';
            var u = res.resourceLink;
            var type = 'video';
            if (u.indexOf('.m3u8') >= 0) type = 'hls';
            var title = mediaTitle;
            if (mediaType === 'tv' && season > 0 && episode > 0) {
                var sp = String(season);
                if (sp.length < 2) sp = '0' + sp;
                var ep2 = String(episode);
                if (ep2.length < 2) ep2 = '0' + ep2;
                title = mediaTitle + ' S' + sp + 'E' + ep2;
            }
            streams.push({
                name: 'MovieBox (' + lang + ') ' + qual,
                title: title,
                url: u,
                quality: qual,
                type: type,
                headers: { 'Referer': API_BASE, 'User-Agent': UA }
            });
        });
    });
    return streams;
}

function getSubjectData(subjectId) {
    var url = API_BASE + '/wefeed-mobile-bff/subject-api/get?subjectId=' + subjectId;
    return authFetch('GET', url);
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
                    if (m2) return getSubjectData(m2.subjectId).then(function(d) {
                        if (!d || !d.data) return [];
                        var dubs = extractDubs(d.data);
                        var promises = dubs.map(function(dub) {
                            return getSubjectData(dub.id).then(function(d2) {
                                if (!d2 || !d2.data) return [];
                                return extractStreams(d2.data, dub.lang, details.title, seasonNum, episodeNum, details.mediaType);
                            });
                        });
                        return Promise.all(promises).then(function(results) {
                            var flat = [];
                            results.forEach(function(a) { flat = flat.concat(a); });
                            flat.sort(function(a, b) {
                                var qa = parseInt(a.quality) || 0;
                                var qb = parseInt(b.quality) || 0;
                                return qb - qa;
                            });
                            return flat;
                        });
                    });
                    return [];
                });
            }

            if (match) {
                return getSubjectData(match.subjectId).then(function(d) {
                    if (!d || !d.data) return [];
                    var dubs = extractDubs(d.data);
                    var promises = dubs.map(function(dub) {
                        return getSubjectData(dub.id).then(function(d2) {
                            if (!d2 || !d2.data) return [];
                            return extractStreams(d2.data, dub.lang, details.title, seasonNum, episodeNum, details.mediaType);
                        });
                    });
                    return Promise.all(promises).then(function(results) {
                        var flat = [];
                        results.forEach(function(a) { flat = flat.concat(a); });
                        flat.sort(function(a, b) {
                            var qa = parseInt(a.quality) || 0;
                            var qb = parseInt(b.quality) || 0;
                            return qb - qa;
                        });
                        return flat;
                    });
                });
            }

            return [];
        });
    });
}

module.exports = { getStreams: getStreams };
