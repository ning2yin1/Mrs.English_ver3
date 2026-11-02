# Startup, touch controls and branding

## Implemented

- Viewport bounds and `touch-action: pan-x pan-y` prevent page zoom while allowing ordinary one-finger panning. Non-passive capture handlers cancel multi-touch and Safari gesture events. Ordinary touchend/dblclick events are not cancelled, so consecutive game taps still execute. OS-wide magnification and browser/accessibility overrides cannot be disabled by a webpage. Physical iPhone Safari and installed PWA remain required device checks.
- Initial JavaScript now loads only the title/profile/layout/wallet shell. Collection, Inventory, Shop, Play, Mission and their screen data are loaded on demand. Saved mission notifications initialize after the title becomes visible. Game controllers, rewards and save formats are unchanged.
- Current-screen fonts and artwork begin fetching together. All required image decodes finish before a setup screen becomes interactive. Previously fonts were awaited serially and some screens were marked ready before their artwork had loaded. An unchanged photographic backdrop is reused instead of decoding/replacing it again.
- Title photography and title artwork are preloaded from HTML. A build-time lossless WebP of the existing title artwork is used when smaller; decoded visible pixels and alpha match the original (verified: zero differences). Original source artwork remains unchanged.
- The background selector previously downloaded all 22 full-resolution photographs (about 6.8 MB). The build derives 320x224-bounded, quality-88 JPEG thumbnails from the corresponding original files; each ID still maps to its original photo. Total thumbnails are about 0.36 MB. Full-resolution photographs remain untouched and are used for previews/TOP. The unrelated comparison thumbnails from the kit are not used.
- Full offline preparation still completes before first Service Worker activation. Its two background queues now pause/abort their optional in-flight downloads while foreground loading is active, then retry after 750 ms of quiet. This gives navigation priority instead of allowing large unrelated offline assets to occupy connections. Initial background requests may revalidate HTTP cache (`no-cache`); explicit app updates retain their `no-store` behavior. Foreground client leases expire if a tab disappears. Existing offline caches and all application saves are retained.
- Loading markup, ring CSS and its small controller are inline in HTML, before the application module. Tasks longer than 250 ms show a transparent overlay; only the ring rotates, with no artificial minimum display time. Fast transitions do not flash it. Main-screen and feature loads plus photographic backdrop loads are tracked. Completion hides it; failure stops the ring and provides retry; watchdogs prevent endless spinning. Reduced-motion users get a stationary ring.

## Supplied logo — external prerequisite remains

The chat shows a white apple image, but no file ID, local attachment path or downloadable URL was made available to this executor. The workspace/shared/download directories and latest repository were inspected; the source image is absent. Its pixels must not be reconstructed or replaced with a similar logo.

The intended exact-source location is `assets/branding/apple-white-source.png`. `scripts/prepare-branding.mjs` is ready to preserve the source bytes, remove an opaque black matte when necessary, trim transparent margins, and generate a compact transparent logo plus 180/192/512 PNG icons. The icons use green #168447, centered logo and 17% padding. No tracing/generative operation is used. The build embeds the compact PNG into HTML for immediate loading-logo display, updates the Apple Touch Icon to a source-hash filename, and updates Manifest icons while retaining app names. This pipeline has only been verified with a clearly separate synthetic test fixture; no claim is made that the actual supplied apple has been converted.

Until the actual source file is available, the loading widget shows the ring alone and existing home-screen icons are retained. The white-logo center and green apple icons are NOT complete. Supplying the original image as a downloadable file/ZIP will unblock these two items. No substitute has been committed.

After real icon generation, Safari/PWA may keep an existing home-screen icon. Check a newly added home-screen shortcut after updating the app. Do not clear website data to refresh the icon: that would remove locally saved progress. Removing an installed app/shortcut can also affect its storage depending on iOS version; confirm progress preservation before reinstallation.

## Measurement

Controlled local HTTP/1 test: six connections, 40 ms per request plus 256 KiB/s per connection; fresh browser context; one before/after sample. These are comparative laboratory results, not measured iPhone/GitHub Pages timings. The new setup readiness check waits for actual decoded images, whereas the prior build could mark a screen ready earlier.

| Stage | Before (ms) | After (ms) |
|---|---:|---:|
| Initial title | 2,055 | 1,899 |
| Nickname | 599 | 766 |
| Member selection | 4,836 | 4,033 |
| Background grid | 6,530 | 1,956 |
| TOP | 6,200 | 3,294 |
| Total | 20,220 | 11,948 |

Requested response sizes during the measured flow decreased from 20.5 MB to 6.4 MB (including optional/background requests; not an exact wire-byte counter). Actual results vary with cache state, device and network. Logs are in ignored `test-results/startup/`. `node tests/startup-performance.mjs <build-folder> <label>` reproduces the controlled test against any built snapshot.

## Checks

- `npm run test:startup`: loading visible even while the main module is delayed, CSS ring rotation, no fast-task flash, stop/retry on failed navigation, ordinary double taps delivered twice, Chromium mobile pinch retains scale 1, Safari gesture cancellation and actual one-finger list scroll.
- `npm test`: initial setup, 22 backgrounds, profile persistence, menus, responsive layouts and complete offline reload.
- `npm run test:settings`: Menu/settings, one-file update checks, failed download/retry, legacy worker migration and save preservation.
- `npm run test:mission-timing`: immediate rewards, no notifications during active play, ordered result notifications and navigation preservation.
- `HOME_HUD_OUTPUT=test-results/home-hud npm run test:home`: seven TOP viewports, original artwork dimensions, pinned navigation and saved profile/background preservation.
- `npm run build:pages`: formal production build; development grants remain disabled. Original background/photo/card files have no tracked changes.
