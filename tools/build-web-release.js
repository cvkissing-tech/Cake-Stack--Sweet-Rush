const fs = require('fs')
const path = require('path')
const assetFiles = require('./release-assets')

const root = path.resolve(__dirname, '..')
const releaseDir = path.resolve(root, 'web-release')
const assetsDir = path.join(releaseDir, 'assets')
const distDir = path.join(releaseDir, 'dist')

if (!releaseDir.startsWith(`${root}${path.sep}`)) {
  throw new Error('Release directory must stay inside the project')
}

fs.rmSync(releaseDir, { recursive: true, force: true })
fs.mkdirSync(assetsDir, { recursive: true })
fs.mkdirSync(distDir, { recursive: true })

fs.copyFileSync(path.join(root, 'index.html'), path.join(releaseDir, 'index.html'))
fs.copyFileSync(path.join(root, 'dist', 'main.js'), path.join(distDir, 'main.js'))

for (const file of assetFiles) {
  const source = path.join(root, 'assets', file)
  if (!fs.existsSync(source)) throw new Error(`Missing release asset: ${file}`)
  const destination = path.join(assetsDir, file)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

fs.writeFileSync(path.join(releaseDir, '.nojekyll'), '')

console.log(`Static H5 release created at ${releaseDir}`)
console.log(`${assetFiles.length + 3} files ready for upload`)
