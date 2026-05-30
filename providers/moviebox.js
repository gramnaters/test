function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve([
    {
      name: 'MovieBox Test',
      title: '1080p Test Stream',
      url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
      quality: '1080p',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }
  ]);
}

module.exports = { getStreams: getStreams };
