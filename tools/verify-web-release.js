const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const assetFiles = require('./release-assets')

const root = path.resolve(__dirname, '..')
const release = path.join(root, 'web-release')
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

const sourceMain = path.join(root, 'dist', 'main.js')
const releaseMain = path.join(release, 'dist', 'main.js')
assert.strictEqual(hash(sourceMain), hash(releaseMain), 'dist/main.js does not match release')

assetFiles.forEach((file) => {
  const source = path.join(root, 'assets', file)
  const published = path.join(release, 'assets', file)
  assert(fs.existsSync(source), `Missing source runtime asset: ${file}`)
  assert(fs.existsSync(published), `Missing release runtime asset: ${file}`)
  assert.strictEqual(hash(source), hash(published), `Release asset differs: ${file}`)
})

assert(fs.existsSync(path.join(release, 'index.html')), 'Missing release index.html')
console.log(`Web release verified: main.js and ${assetFiles.length} runtime assets match`)
