# Local development

## Prerequisites

- Node.js and npm
- A modern browser with Canvas support

## Install and run

```bash
npm install
npm start
```

The local server listens on `http://localhost:8082`. The server uses the source `index.html`, the compiled `dist/main.js`, and the runtime files in `assets/`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile `src/` into `dist/main.js` |
| `npm run verify:core` | Check gameplay rules and tower calculations |
| `npm run release:web` | Build a complete static site in `web-release/` |
| `npm run verify:release` | Compare the static release with source output |
| `npm run release:offline` | Build a self-contained offline HTML file |

The generated directories are intentionally ignored by Git. Rebuild them whenever the source or runtime assets change.

## Runtime assets

`tools/release-assets.js` is the source of truth for assets copied into the web and offline releases. Keep source artwork, drafts, screenshots, and test captures outside the public runtime asset set.
