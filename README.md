# MovieBox Nuvio Plugin

A high-quality local scraper for the Nuvio streaming application that fetches premium streams from MovieBox H5 API via TMDB lookup.

## Installation

1. Open **Nuvio** app
2. Go to **Settings → Local Scrapers**
3. Add this repository URL:
   ```
   https://raw.githubusercontent.com/gramnaters/test/main/manifest.json
   ```
4. Enable the **MovieBox** scraper

## Available Scraper

| Provider | Language | Content | Quality | NuvioApp | NuvioTV |
|---|---|---|---|---|---|
| MovieBox |   🇮🇳  | Movies & TV | 1080p / 720p / 480p / 360p | ✅ | ✅ |

## Features

- 🎬 **Movies and TV Shows** — both supported via TMDB ID lookup
- 🎯 **Automatic TMDB integration** — resolves titles automatically
- 📊 **Multiple quality options** — 1080p, 720p, 480p, 360p
- 🌍 **Multi-language support** — Original + Hindi audio tracks
- ⚡ **Fast scraping** — optimized with LRU cache (300 entries, 20 min TTL)
- 🔒 **Proper headers** — X-Client-Token auth, referer spoofing

## Performance

- **Average Response Time**: 1-3 seconds
- **Success Rate**: 85%+
- **Quality Support**: Up to 1080p (Full HD)
- **Cache**: LRU with 20-minute TTL

## Technical Details

### How it works

1. **TMDB Lookup** — resolves the TMDB ID to a title and year
2. **MovieBox Search** — searches the MovieBox H5 API (`h5-api.aoneroom.com`) for matching subjects
3. **Download Resolution** — fetches direct MP4 download URLs with quality options
4. **Stream Construction** — returns Nuvio-compatible stream objects

### API Authentication

The MovieBox API requires a dynamic `X-Client-Token` header generated from an MD5 hash of the reversed Unix timestamp. This plugin handles this automatically.

## Files

```
├── manifest.json           # Nuvio scraper manifest
└── providers/
    └── moviebox.js         # Stream plugin (main scraper)
```

## License

This project is licensed under the GNU General Public License v3.0.

## Disclaimer

This project is for educational purposes only. Users are responsible for ensuring their use complies with applicable laws and regulations.

---

**Created with ❤️ for Nuvio**
