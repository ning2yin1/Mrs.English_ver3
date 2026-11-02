# Mission implementation record

The uploaded kit is expanded at the repository root, rather than a mrs-english-mission-kit directory. CODEX_INSTRUCTIONS.md, README (2).md, docs/MISSION_SPEC.md, docs/mission_definitions.json, docs/DIAMOND_SPEC.md, docs/NOTIFICATION_SPEC.md, docs/LAYOUT_SPEC (2).md, the three approved references, styles/mission.css and asset manifests are the implementation basis.

Inspected integration points:
- src/app.js routes the existing Mission target (previously placeholder/mission).
- src/play/store.js first saves each graded answer in change('answer'); settle commits a completed 10-question stage, learning records and its existing stage reward. Mission effects join these commits without altering scoring, questions, rewardCoins or daily multipliers.
- src/inventory/store.js upgrade validates a stable operation ID, current level and existing coin cost. Diamond payment and successful-upgrade progress join this commit.
- src/inventory/persistence.js provides a common Web Lock and recoverable prepared/committed/applied journal. The journal now accepts the new mission key. Durable recovery projects the mission, wallet and original operation together.
- src/wallet.js reads the existing mrsEnglishV3.wallet.v1 root. Existing diamonds are retained; truly missing diamonds are zero (the former Shop fallback of 21 was display-only). No mock balances are granted.
- The existing Shop presents only card packs and their purchase confirmation. A diamond exchange placement/confirmation would require an unapproved design change. Only the locked, idempotent 10 diamonds -> 1,000 R exchange operation is exposed in the mission store; no exchange UI is added.
- Kit PNGs match existing files by SHA-256. Runtime URLs reuse collection background/frame, nickname header/back, home button/status/coin/diamond. The approved JPEGs are never runtime backgrounds. Duplicate kit PNGs are excluded from build output.

Mission progress starts with post-install committed events only. Each answer uses stage ID/index, each clear uses stage ID and each upgrade uses its existing operation ID. Per-period aggregates, actual within-stage streaks, processed event IDs, reward ledger and notification outbox are stored under mrsEnglishV3.missions.v1. Historical periods and processed IDs are retained across JST rollovers; card/learning/gacha/profile data are not reset.

Validation and deployment results are recorded below after implementation.

## Verified results

- `npm run build:pages` succeeds in formal mode; no development grants enabled.
- `npm run test:mission` passes: exact definitions, all 12 rewards/bonuses, JST midnight/Monday and multi-week absence, cross-midnight actual correct streak, incorrect answers breaking the true streak, stable IDs, same grammar deduplication, zero-correct completed stages, journal interruption/recovery, notification outbox, 9/10-diamond exchange boundaries, all rarity costs, and real grading/settlement hooks.
- Browser verification compares approved sample values and screenshots at 1536x710. Responsive checks cover 844x390, 852x393 and 667x375 with simulated safe areas and list-only scrolling. Both tabs, progress bars, statuses and special reward rows remain dynamic HTML.
- A single shared notification is exercised across TOP, Inventory, Shop and READY. Queued rewards, diamond notification, pointer transparency, live currency refresh, reload persistence and no replay are verified. The same shell handles title/setup/settings/result via actual header measurement and safe-area positioning; no route-specific toast component is created.
- Actual Inventory UI rejects R upgrades at 4 diamonds and accepts at 5, retaining the existing 500 R cost in the fixture, consuming both balances and increasing the existing instance level. No card image/frame or ability calculation changes.
- `npm test`, `HOME_HUD_OUTPUT=test-results/home-hud npm run test:home`, and `npm run test:settings` pass, including offline setup, 7 TOP viewport layouts, Menu/settings persistence and lightweight update activation/data preservation.
- Existing Collection, Shop, result-model, Inventory and Play store tests pass. Inventory fixtures now explicitly fund diamond costs; Play wallet assertions include separately earned mission rewards while existing `result.rewardCoins` and scoring assertions remain unchanged. Legacy save journals remain recoverable.
- Screenshots and machine-readable results are in ignored `test-results/mission/`. Physical iPhone Safari remains a user test; no physical-device verification is claimed.

## Remaining UI decision

Diamond exchange is intentionally not linked into the card-pack Shop UI. Candidate: an approved currency-detail/Shop header entry and confirmation using the existing Shop confirmation pattern, with explicit 10-diamond cost and +1,000 R preview. Approval of placement/design is required before adding that UI. Exchange processing itself is implemented and tested.

No historical plays are retroactively rewarded. Existing stored diamond counts are preserved. A truly absent diamond field is 0, rather than the former mock-only display value 21. Existing login behavior, card ownership/levels/decks, gacha/free-pack flags, learning records, scoring and stage rewards are retained. The client uses the device clock consistently with the existing offline app; it does not introduce an online time service or claim resistance to deliberate device-clock changes.

Runtime additions: src/mission/{definitions,assets,engine,store,view,controller}.js, skin.css, layout.css, notification.css and src/wallet.js. Integration changes: src/app.js, src/home-hud.js, src/inventory/{store,persistence,controller,view}.js, src/play/store.js, src/shop/{store,controller}.js and scripts/build.mjs. Tests and the test:mission package command are included. Production copies of the duplicate kit PNGs are omitted; existing identical assets are reused. No background/person/card images were modified or generated.
