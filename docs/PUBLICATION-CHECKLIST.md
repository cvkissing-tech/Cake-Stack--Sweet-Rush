# Publication checklist

Use this checklist before making the project public or attaching a release file.

## Repository boundary

- [ ] The Git repository root is the standalone Sweet Stack copy, not the parent `游戏` folder.
- [ ] `node_modules/`, `dist/`, `web-release/`, `offline-release/`, screenshots, and browser traces are ignored.
- [ ] No private paths, credentials, API keys, or local settings are present.
- [ ] Internal design plans are kept out of the public repository unless they are intentionally rewritten for public use.

## Code and asset review

- [ ] `package.json` and the lockfile identify Sweet Stack rather than the old Tower Game project.
- [ ] Every image and audio file in `assets/` is owned by you or has a license that permits redistribution.
- [ ] The inherited license and any required attribution are preserved.
- [ ] Custom artwork and generated audio have a documented source or permission record.

## Verification

```bash
npm install
npm run verify:core
npm run release:web
npm run verify:release
npm run release:offline
```

- [ ] The core verification command passes.
- [ ] The web release verification command passes.
- [ ] The opening screen, touch/click placement, PERFECT and failure flows, restart, Dessert Book progress, audio fallback, and narrow mobile layouts are manually tested.
- [ ] Test at least one 390×844 and one 430×932 viewport before announcing a release.

## Publishing outputs

- Source repository: commit the clean source copy only.
- Web deployment: publish the generated `web-release/` directory through a build/deployment step.
- Offline download: attach `offline-release/sweet-stack-offline.html` to a release when appropriate.
- Do not commit generated release folders or signing/private files into the source repository.
