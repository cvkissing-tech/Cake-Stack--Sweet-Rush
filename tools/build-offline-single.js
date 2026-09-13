const fs = require('fs')
const path = require('path')
const assetFiles = require('./release-assets')

const root = path.resolve(__dirname, '..')
const outputDir = path.resolve(root, 'offline-release')
const outputFile = path.join(outputDir, 'sweet-stack-offline.html')

if (!outputDir.startsWith(`${root}${path.sep}`)) {
  throw new Error('Offline release directory must stay inside the project')
}

const mimeTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
}

const toDataUrl = (file) => {
  const extension = path.extname(file).toLowerCase()
  const mime = mimeTypes[extension]
  if (!mime) throw new Error(`Unsupported offline asset type: ${file}`)
  const source = path.join(root, 'assets', file)
  if (!fs.existsSync(source)) throw new Error(`Missing offline asset: ${file}`)
  return `data:${mime};base64,${fs.readFileSync(source).toString('base64')}`
}

const escapeInlineScript = code => code.replace(/<\/script/gi, '<\\/script')

const embeddedAssets = {}
for (const file of assetFiles) {
  if (file === 'zepto-1.1.6.min.js') continue
  embeddedAssets[file] = toDataUrl(file)
}

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const mainBundle = escapeInlineScript(fs.readFileSync(path.join(root, 'dist', 'main.js'), 'utf8'))
const zepto = escapeInlineScript(fs.readFileSync(
  path.join(root, 'assets', 'zepto-1.1.6.min.js'),
  'utf8'
))
const assetBootstrap = escapeInlineScript(
  `window.SWEET_STACK_ASSETS=${JSON.stringify(embeddedAssets)};`
)

html = html.replace(
  '<link rel="icon" href="./assets/favicon.png">',
  `<link rel="icon" href="${embeddedAssets['favicon.png']}">`
)
html = html.replace(
  /src="\.\/assets\/home-cake-tower\.png"/g,
  `src="${embeddedAssets['home-cake-tower.png']}"`
)
html = html.replace(
  '<script src="./dist/main.js"></script><script src="./assets/zepto-1.1.6.min.js"></script>',
  () => `<script>${assetBootstrap}</script><script>${mainBundle}</script><script>${zepto}</script>`
)

const externalScriptTag = html.match(/<script\b[^>]*\bsrc=["'][^"']+["']/i)
if (externalScriptTag) {
  throw new Error(`Offline build still contains an external script tag: ${externalScriptTag[0]}`)
}
if (/<(?:img|link)\b[^>]*(?:src|href)=["']\.\/assets\//i.test(html)) {
  throw new Error('Offline build still contains a direct external asset tag')
}

fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(outputFile, html)

const sizeMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2)
console.log(`Offline single-file release created at ${outputFile}`)
console.log(`${assetFiles.length - 1} runtime assets embedded; ${sizeMB} MB`)
