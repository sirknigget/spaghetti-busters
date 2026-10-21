# Spaghetti Busters

**Clean code. Dirty work.** A browser arcade shooter about clearing a backlog of bad code with a very large cannon.

![Spaghetti Busters opening screen](docs/screenshots/menu.png)

Play as a code quality specialist in a white suit. Shoot the letters out of giant TypeScript blocks before they reach the left edge. Clear each wave to face faster code, armored robots, angry exceptions, and a boss every fifth level. Your best score stays in your browser.

![Gameplay with 3D code blocks](docs/screenshots/gameplay.png)

## Play locally

You need Node.js 22.13+ (or 24+) and npm. The pinned anti-slop dependency also needs pnpm 10.33.0 during installation.

```sh
npm install --global pnpm@10.33.0
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser that supports WebGL 2. The game bundles its assets and does not need an online service to play. On a touch device, use landscape orientation for more room.

## Controls

| Action                   | Control                          |
| ------------------------ | -------------------------------- |
| Move and aim             | Mouse or touch drag              |
| Move up or down          | Arrow Up/Down or W/S             |
| Fire the cannon          | Left click, hold, or Space       |
| Select a special         | 1–4 or the on-screen slots       |
| Use the selected special | Right click, hold, or touch FIRE |
| Pause or resume          | P, Escape, or the pause button   |
| Turn sound on or off     | Speaker button                   |

Shoot highlighted weapon variables to release floating guns, then **shoot the gun to equip it**. Double, triple, quad, and quint guns have limited ammo; the basic cannon does not. Collect ammo and special weapons from floating bonuses or highlighted code.

The four specials give you different ways to clear the screen:

- **Backspace missiles** follow the block closest to the left edge.
- **Recycle Bin grenades** explode near your aim.
- **Code Review** freezes enemies and their attacks for two seconds.
- **Lint Bomb** splits large blocks and destroys small blocks and exceptions.

Watch for red, angry code that throws exceptions, and dodge fast `await setTimeout(milliseconds);` blocks that briefly disable your controls. Armored robots generate more code until you destroy them. Every fifth level brings in `FactoryFactoryFactory`, a boss that makes smaller blocks. Clear the boss and its code to move on.

Hits punch holes through the 3D blocks. Destroyed code and robots break into pieces that tumble across the street, while the action stays on a 2D plane. Original music carries from the opening screen into play and pauses with the game.

![Code blocks breaking into physical pieces](docs/screenshots/code-disintegration.png)

## Build and verify

Run these commands after [installing the project](#play-locally):

```sh
npm run format:check
npm run lint
npm run build
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

`npm run preview` serves the production build on port 3000. Stop the development server first. For model work, see the [model editing guide](docs/models/README.md).

## Code quality gates

Each pull request runs formatting, ESLint, type-aware Oxlint, Stylelint, a TypeScript check and production build, unit tests, and Chromium browser tests. Other checks find duplicates and unused code and check dependencies and architecture. Branch protection requires passing checks and an up-to-date branch before merge. Deployment starts after merge without running the PR checks again.

Here is how the gates changed, **oldest to newest by merge order**. Only merged PRs that added or changed quality checks appear here:

- [PR #1](https://github.com/sirknigget/spaghetti-busters/pull/1) added Prettier formatting, build and unit-test checks, and browser-test shards in CI.
- [PR #2](https://github.com/sirknigget/spaghetti-busters/pull/2) added ESLint, type-aware Oxlint, and Stylelint checks.
- [PR #3](https://github.com/sirknigget/spaghetti-busters/pull/3) limited file and function size, parameters, and declared members, and added basic readability rules.
- [PR #4](https://github.com/sirknigget/spaghetti-busters/pull/4) required named runtime numbers and shared color palettes instead of inline values.
- [PR #5](https://github.com/sirknigget/spaghetti-busters/pull/5) set limits on cognitive and cyclomatic complexity.
- [PR #6](https://github.com/sirknigget/spaghetti-busters/pull/6) required blank lines around blocks and declaration groups.
- [PR #7](https://github.com/sirknigget/spaghetti-busters/pull/7) made five duplicate-code scans blocking, with no accepted duplicate baseline.
- [PR #9](https://github.com/sirknigget/spaghetti-busters/pull/9) limited files and subfolders per folder and required project-root imports.
- [PR #11](https://github.com/sirknigget/spaghetti-busters/pull/11) added unused-code checks for development and production, plus dependency and architecture-boundary checks.
- [PR #13](https://github.com/sirknigget/spaghetti-busters/pull/13) added a dedicated architecture check for module cohesion, coupling, and dependency instability.

For detailed rules and calibration, see [duplicate detection](docs/duplicate-detection.md), [dependency checks](docs/dependency-enforcement.md), and [architecture metrics](docs/architecture-rollout.md).

## Deploy to Vercel

GitHub Actions deploys changes merged into protected `main`. Follow the [Vercel setup guide](docs/vercel-deployment.md) to configure the project and required GitHub secrets.

## Credits

Robot brand marks are bundled from [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT) and [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0). Source details and the license are in `public/assets/brands/`.

The bundled robotic “Boss fight” voice was generated with [eSpeak NG](https://github.com/espeak-ng/espeak-ng); no speech service or runtime voice dependency is required. Cartoon artwork, original chiptune music, and sound effects were created for this game. The opening backdrop is [a technology photograph from Unsplash](https://images.unsplash.com/photo-1550751827-4bd374c3f58b), used under the [Unsplash license](https://unsplash.com/license). Barlow Condensed and Space Grotesk are bundled under their SIL Open Font Licenses in `public/fonts/`.
