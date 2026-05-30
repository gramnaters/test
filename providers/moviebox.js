// MovieBox Scraper for Nuvio
// Uses h5-api.aoneroom.com with X-Client-Token + Referer auth

var API = "https://h5-api.aoneroom.com";
var TMDB_KEY = 'd131017ccc6e5462a81c9304d21476de';
var TMDB_URL = 'https://api.themoviedb.org/3';
var SITE = 'https://themoviebox.org';

function genToken() {
    var ts = Math.floor(Date.now() / 1000).toString();
    var rev = ts.split('').reverse().join('');
    var hash = CryptoJS.MD5(rev).toString(CryptoJS.enc.Hex);
    return ts + '.' + hash;
}

function baseHdrs(extra) {
    var h = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': SITE,
        'Referer': SITE + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-client-info': '{"timezone":"Asia/Calcutta"}',
        'x-request-lang': 'en',
        'X-Client-Token': genToken()
    };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
}

function apiCall(method, url, body, extraHdrs) {
    var opts = { method: method, headers: baseHdrs(extraHdrs) };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function(r) {
        return r.text().then(function(txt) {
            if (!r.ok) return null;
            try { return JSON.parse(txt); } catch(e) { return txt; }
        });
    }).catch(function() { return null; });
}

function getTmdb(tmdbId, type) {
    var mt = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    return fetch(TMDB_URL + '/' + mt + '/' + tmdbId + '?api_key=' + TMDB_KEY).then(function(r) {
        return r.json();
    }).then(function(d) {
        return {
            title: mt === 'movie' ? (d.title || d.original_title) : (d.name || d.original_name),
            year: (d.release_date || d.first_air_date || '').substring(0, 4),
            mediaType: mt
        };
    }).catch(function() { return null; });
}

function normTitle(s) {
    if (!s) return "";
    return s.replace(/\[.*?\]/g, " ").replace(/\(.*?\)/g, " ")
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu)\b/gi, " ")
        .replace(/\b(dual audio)\b/gi, " ")
        .trim().toLowerCase().replace(/:/g, " ")
        .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
}

function searchBox(query) {
    return apiCall('POST', API + '/wefeed-h5api-bff/subject/search', {
        keyword: query, page: 1, perPage: 24, subjectType: 0
    }).then(function(res) {
        return (res && res.data && res.data.items) || [];
    });
}

function findMatch(items, tmdbTitle, tmdbYear, mediaType) {
    var norm = normTitle(tmdbTitle);
    var target = mediaType === 'movie' ? 1 : 2;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.subjectType !== target) continue;
        var nt = normTitle(it.title);
        var yr = it.year || (it.releaseDate ? it.releaseDate.substring(0, 4) : null);
        var score = 0;
        if (nt === norm) score += 50;
        else if (nt.indexOf(norm) >= 0 || norm.indexOf(nt) >= 0) score += 15;
        if (tmdbYear && yr && tmdbYear == yr) score += 35;
        if (score > bestScore) { bestScore = score; best = it; }
    }
    return bestScore >= 40 ? best : null;
}

function getDetail(detailPath) {
    return apiCall('GET', API + '/wefeed-h5api-bff/detail?detailPath=' + detailPath);
}

function getDownloads(subjectId, se, ep, detailPath) {
    var url = API + '/wefeed-h5api-bff/subject/download?subjectId=' + subjectId;
    if (se != null) url += '&se=' + se;
    if (ep != null) url += '&ep=' + ep;
    return apiCall('GET', url, null, {
        'Referer': SITE + '/watch/' + detailPath
    }).then(function(res) {
        return (res && res.data && res.data.downloads) || [];
    });
}

function buildStreams(downloads) {
    var seen = {};
    var result = [];
    for (var i = 0; i < downloads.length; i++) {
        var dl = downloads[i];
        if (!dl.url || seen[dl.url]) continue;
        seen[dl.url] = true;
        var qual = (dl.resolution || 'Auto') + 'p';
        var ft = null;
        var u = dl.url.toLowerCase();
        if (u.indexOf('.m3u8') >= 0) ft = 'hls';
        else if (u.indexOf('.mp4') >= 0 || u.indexOf('.mkv') >= 0) ft = 'video';
        result.push({
            name: 'MovieBox | ' + qual,
            title: qual,
            url: dl.url,
            quality: qual,
            type: ft,
            headers: { 'Referer': SITE + '/', 'Origin': SITE },
            provider: 'moviebox'
        });
    }
    result.sort(function(a, b) {
        return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
    });
    return result;
}

function fetchStreams(match, details, seasonNum, episodeNum) {
    if (!match) return Promise.resolve([]);

    var sid = match.subjectId;
    var dp = match.detailPath;
    var isTv = details.mediaType === 'tv';

    if (isTv) {
        var se = parseInt(seasonNum, 10) || 1;
        var ep = parseInt(episodeNum, 10) || 1;
        return getDetail(dp).then(function(detailRes) {
            var resource = detailRes && detailRes.data && detailRes.data.resource;
            if (resource && resource.seasons) {
                for (var i = 0; i < resource.seasons.length; i++) {
                    if (resource.seasons[i].se == se) {
                        if (resource.seasons[i].maxEp > 0 && ep > resource.seasons[i].maxEp) {
                            ep = resource.seasons[i].maxEp;
                        }
                        break;
                    }
                }
            }
            return getDownloads(sid, se, ep, dp).then(function(dls) {
                return buildStreams(dls);
            });
        });
    }

    return getDownloads(sid, 0, 0, dp).then(function(dls) {
        return buildStreams(dls);
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (seasonNum == null) seasonNum = 1;
    if (episodeNum == null) episodeNum = 1;

    return getTmdb(tmdbId, mediaType).then(function(details) {
        if (!details) return [];

        return searchBox(details.title).then(function(items) {
            var match = findMatch(items, details.title, details.year, details.mediaType);

            if (match) return fetchStreams(match, details, seasonNum, episodeNum);

            // Fallback: search with first 3 keywords
            var words = details.title.split(' ');
            if (words.length > 3) {
                return searchBox(words.slice(0, 3).join(' ')).then(function(items2) {
                    var m2 = findMatch(items2, details.title, details.year, details.mediaType);
                    return fetchStreams(m2, details, seasonNum, episodeNum);
                });
            }
            return [];
        });
    });
}

module.exports = { getStreams: getStreams };
