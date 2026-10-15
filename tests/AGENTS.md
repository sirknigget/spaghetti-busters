# Test organization

Vitest discovers colocated `src/**/*.test.ts` and `lint/**/*.test.ts`.
`tests/unit/` contains shared unit fixtures, not a separately discovered unit
suite. Playwright discovers the browser scenarios under this directory.

| Folder       | Coverage                                                      |
| ------------ | ------------------------------------------------------------- |
| `gameplay/`  | Core play, enemies, bosses, specials, ammo, progression       |
| `rendering/` | Real Three.js meshes, physical debris, original-surface death |
| `interface/` | Prelude, menus, help, pause/restart, keyboard/touch controls  |
| `audio/`     | Opening music, transport, sound controls, boss voice          |
| `shared/`    | Browser entry/setup, input and snapshot helpers               |
| `unit/`      | Deterministic simulation setup and model-loading fixtures     |

Lint policy tests belong under `lint/tests/`, independent of game source.

## Browser setup and diagnostics

Use `shared/browser-fixtures.ts` to enter a run: visit `/`, click **Click to
play**, click Start, then wait for `window.__spaghetti`. Debris scenarios also
wait for physics initialization. The hook exposes `simulation`, `scene`,
`renderer`, and `world` only in development or test builds.

Keep Node-side test imports rooted at `#root/`. Imports evaluated inside the
browser use `/src/...` or `/tests/...` URLs. Reuse existing deterministic fixtures
and narrowly inspect the relevant state instead of relying on arbitrary delays.
Collect page/asset errors when verifying rendering behavior.

`playwright.config.ts` uses one worker because software WebGL is expensive; CI
splits scenarios across two runners. Its server starts on port 3000 and reuses an
existing server. Ensure that server serves the checkout being tested. Setting
`PLAYWRIGHT_BASE_URL` changes the browser target but does not change the configured
server command/port; an isolated port requires overriding both.

Run selected Vitest files with `npm test -- <path>` and browser scenarios with
`npm run test:e2e -- <path>`. Keep meaningful behavior assertions, including
pause/reset and gameplay independence for visual effects. Numeric fixture
exemptions do not remove function/file, spacing, complexity, or folder limits.
