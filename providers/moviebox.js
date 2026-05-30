var API = 'https://h5-api.aoneroom.com';
var TMDB = 'https://api.themoviedb.org/3';
var KEY = 'd131017ccc6e5462a81c9304d21476de';

function genToken() {
    var ts = Math.floor(Date.now() / 1000).toString();
    var rev = ts.split('').reverse().join('');
    var hash = CryptoJS.MD5(rev).toString(CryptoJS.enc.Hex);
    return ts + '.' + hash;
}

function hdrs(extra) {
    var h = {
        'X-Client-Token': genToken(),
        'X-Request-Lang': 'en',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept': 'application/json',
        'Referer': 'https://h5.aoneroom.com/',
        'Origin': 'https://h5.aoneroom.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
}

function getTmdb(id, type) {
    var t = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    return fetch(TMDB + '/' + t + '/' + id + '?api_key=' + KEY).then(function(r) { return r.json(); }).then(function(d) {
        return {
            title: t === 'tv' ? (d.name || d.original_name) : (d.title || d.original_title),
            year: ((t === 'tv' ? d.first_air_date : d.release_date) || '').substring(0, 4),
            type: t
        };
    });
}

function norm(s) {
    if (!s) return '';
    return s.replace(/\[.*?\]/g, ' ')
        .replace(/\(.*?\)/g, ' ')
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, ' ')
        .trim().toLowerCase().replace(/:/g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
}

function search(q, type) {
    var st = type === 'tv' ? 2 : 1;
    var body = JSON.stringify({ keyword: q, page: 1, perPage: 10, subjectType: st });
    return fetch(API + '/wefeed-h5api-bff/subject/search', {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: body
    }).then(function(r) { return r.json(); }).then(function(j) {
        return (j.data && j.data.items) || [];
    });
}

function match(items, title, year, type) {
    var n = norm(title);
    var t = type === 'tv' ? 2 : 1;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.subjectType !== t) continue;
        var nt = norm(it.title);
        var yr = (it.releaseDate || '').substring(0, 4);
        var score = 0;
        if (nt === n) score += 50;
        else if (nt.indexOf(n) >= 0 || n.indexOf(nt) >= 0) score += 15;
        if (year && yr && year === yr) score += 35;
        if (score > bestScore) { bestScore = score; best = it; }
    }
    return bestScore >= 40 ? best : null;
}

function getStreams(tmdbId, mediaType, season, episode) {
    return getTmdb(tmdbId, mediaType).then(function(info) {
        if (!info || !info.title) return [];
        return search(info.title, info.type).then(function(items) {
            var m = match(items, info.title, info.year, info.type);
            if (!m) return [];
            var dp = m.detailPath || '';
            var ref = 'https://fmoviesunblocked.net/spa/videoPlayPage/movies/' + dp + '?id=' + m.subjectId + '&type=/movie/detail';
            var dlUrl = API + '/wefeed-h5api-bff/subject/download?subjectId=' + m.subjectId;
            if (info.type === 'tv' && season != null && episode != null) {
                dlUrl += '&se=' + season + '&ep=' + episode;
            }
            return fetch(dlUrl, { headers: hdrs({ 'Referer': ref }) }).then(function(r) { return r.json(); }).then(function(j) {
                var dls = (j.data && j.data.downloads) || [];
                var out = [];
                for (var i = 0; i < dls.length; i++) {
                    var dl = dls[i];
                    if (!dl.url) continue;
                    var q = (dl.resolution || 720) + 'p';
                    var t = 'video';
                    if (dl.url.indexOf('.m3u8') >= 0) t = 'hls';
                    out.push({
                        name: 'MovieBox | ' + q,
                        title: info.title + (info.type === 'tv' && season ? ' S' + season + 'E' + episode : ''),
                        url: dl.url,
                        quality: q,
                        type: t,
                        headers: { 'Referer': 'https://fmoviesunblocked.net/', 'Origin': 'https://fmoviesunblocked.net' }
                    });
                }
                out.sort(function(a, b) {
                    var pa = parseInt(a.quality) || 0;
                    var pb = parseInt(b.quality) || 0;
                    return pb - pa;
                });
                return out;
            });
        });
    }).catch(function(e) {
        return [];
    });
}

module.exports = { getStreams: getStreams };
