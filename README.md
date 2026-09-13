<div align="center">

# Sweet Stack

### A cozy, precision-based cake-stacking game for mobile browsers.

<img src="./assets/home-cake-tower.png" width="320" alt="A layered cake tower from Sweet Stack">

Place each dessert, read the landing feedback, and build the tallest and sweetest tower you can.

[简体中文](./README.zh-CN.md)

</div>

## The game

Sweet Stack turns a simple tap-to-drop action into a small test of timing and balance. Every landing changes the shape and rhythm of the tower, so a careful player can build a stable stack while chasing PERFECT streaks and a complete dessert collection.

### What makes it sweet

- **Precision stacking** — Drop each cake when the moving target is aligned.
- **Readable feedback** — PERFECT, GREAT, and SAFE results make every landing understandable.
- **Elastic tower motion** — Good and risky placements visibly affect the tower's balance.
- **SUGAR RUSH** — Build a PERFECT streak to unlock a short high-score moment.
- **Dessert Book** — Discover, master, and crown a growing set of dessert layers.
- **Mobile-first presentation** — Touch-friendly controls, responsive Canvas layout, and graceful audio fallback.

## Gameplay loop

1. Tap or click to release the hanging cake.
2. Land it as close to the target as possible.
3. Use the result, tower motion, and next target to adjust your timing.
4. Keep stacking, unlock desserts, and try to beat your best run.

## Try it locally

```bash
npm install
npm start
```

Then open <http://localhost:8082>. The start command builds the game and serves it locally.

## Build and release

```bash
npm run verify:core
npm run release:web
npm run verify:release
npm run release:offline
```

| Output | Purpose |
| --- | --- |
| `web-release/` | Static web build for a deployment step |
| `offline-release/sweet-stack-offline.html` | Self-contained offline HTML release |

Generated output is ignored by Git so the repository stays focused on source code and runtime assets.

## Project map

| Path | Role |
| --- | --- |
| `index.html` | Product shell, menus, HUD, and browser interface |
| `src/` | Canvas game logic, rules, feedback, and progression |
| `assets/` | Runtime images and audio |
| `tools/` | Build, release, and verification scripts |
| `docs/` | Development and publication notes |

## Project status

This repository contains the public source build of Sweet Stack. Automated gameplay-rule and release-consistency checks pass; manual browser testing is still recommended before presenting a production release as final.

## License and asset note

The source is distributed under the terms in [LICENSE](./LICENSE). The project includes inherited game code and custom visual/audio assets. Confirm the ownership or redistribution permission for every asset before publishing a public repository or release.
