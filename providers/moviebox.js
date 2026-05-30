var API = 'https://h5-api.aoneroom.com';
var TMDB = 'https://api.themoviedb.org/3';
var KEY = '439c478a771f35c05022f9feabcca01c';
var UA = 'Mozilla/5.0';

function getStreams(id, type, s, e) {
  var out = [];
  function push(m) { out.push({ name: m, title: m, url: 'https://x.com/x', quality: 'log' }); }

  try {
    push('0');

    return fetch(TMDB + '/movie/' + id + '?api_key=' + KEY).then(function(r) {
      push('1 status=' + r.status);
      return r.json();
    }).then(function(d) {
      push('2 title=' + (d.title || '?'));

      return fetch(API + '/wefeed-h5api-bff/subject/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'Fight Club', page: 1, perPage: 5, subjectType: 1 })
      }).then(function(r2) {
        push('3 status=' + r2.status);
        return r2.json();
      }).then(function(j) {
        var items = (j.data && j.data.items) || [];
        push('4 items=' + items.length);

        // Try to get downloads for first item
        if (items.length > 0) {
          var first = items[0];
          push('5 first id=' + first.subjectId + ' title=' + (first.title || ''));
          return fetch(API + '/wefeed-h5api-bff/subject/download?subjectId=' + first.subjectId, {
            headers: { 'Referer': 'https://fmoviesunblocked.net/' }
          }).then(function(r3) {
            push('6 dl status=' + r3.status);
            return r3.json();
          }).then(function(j2) {
            var dls = (j2.data && j2.data.downloads) || [];
            push('7 dls=' + dls.length);
            dls.forEach(function(dl, i) {
              if (i < 3) push('8 dl['+i+'] res=' + (dl.resolution||'?') + ' url=' + (dl.url||'').slice(0,50));
            });
            return out;
          });
        }
        return out;
      });
    }).catch(function(e) {
      push('9 err: ' + e.message);
      return out;
    });
  } catch(e) {
    return Promise.resolve([{ name: 'CRASH: ' + e.message, title: 'crash', url: 'https://x.com/x', quality: 'crash' }]);
  }
}

module.exports = { getStreams: getStreams };
