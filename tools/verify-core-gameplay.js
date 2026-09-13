const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Module = require('module')
const babel = require('@babel/core')

const rulesPath = path.resolve(__dirname, '..', 'src', 'gameplayRules.js')
const transformed = babel.transformFileSync(rulesPath).code
const rulesModule = new Module(rulesPath)
rulesModule.filename = rulesPath
rulesModule.paths = Module._nodeModulePaths(path.dirname(rulesPath))
rulesModule._compile(transformed, rulesPath)
const rules = rulesModule.exports
const nearlyEqual = (first, second) => Math.abs(first - second) < 0.0000001

assert.strictEqual(rules.getLandingRating(50, 100, 0, 100), rules.PERFECT)
assert.strictEqual(rules.getLandingRating(55, 100, 0, 100), rules.PERFECT)
assert.strictEqual(rules.getLandingRating(55.01, 100, 0, 100), rules.GREAT)
assert.strictEqual(rules.getLandingRating(65, 100, 0, 100), rules.GREAT)
assert.strictEqual(rules.getLandingRating(65.01, 100, 0, 100), rules.SAFE)

assert.strictEqual(rules.shouldTriggerSugarRush(3, 0), true)
assert.strictEqual(rules.shouldTriggerSugarRush(3, 3), false)
assert.strictEqual(rules.shouldTriggerSugarRush(4, 3), false)
assert.strictEqual(rules.shouldTriggerSugarRush(6, 3), true)
assert.strictEqual(rules.getNextPerfectCombo(rules.PERFECT, 4), 5)
assert.strictEqual(rules.getNextPerfectCombo(rules.GREAT, 4), 0)
assert.strictEqual(rules.getNextPerfectCombo(rules.SAFE, 4), 0)

assert.strictEqual(rules.getScoreDelta(rules.PERFECT, 5, 1, 25, 25), 150)
assert.strictEqual(rules.getScoreDelta(rules.GREAT, 0, 1, 25, 25), 40)
assert.strictEqual(rules.getScoreDelta(rules.GREAT, 0, 2, 25, 25), 80)
assert.strictEqual(rules.getScoreDelta(rules.SAFE, 0, 1, 25, 25), 25)

const tutorialProfile = rules.getDifficultyProfile(0)
assert.strictEqual(tutorialProfile.swingSpeed, 0)

for (let completed = 1; completed <= 2; completed += 1) {
  const profile = rules.getDifficultyProfile(completed)
  assert.strictEqual(profile.angle, 28)
  assert(nearlyEqual(profile.swingSpeed, 0.78))
  assert.strictEqual(profile.platformSpeed, 0)
}

const assertOnlyIncreases = (completed, property) => {
  const current = rules.getDifficultyProfile(completed)
  const previous = rules.getDifficultyProfile(completed - 1)
  const properties = ['angle', 'swingSpeed', 'platformSpeed']
  properties.forEach((name) => {
    if (name === property) assert(current[name] > previous[name], `${name} must rise at ${completed}`)
    else assert(nearlyEqual(current[name], previous[name]), `${name} must stay fixed at ${completed}`)
  })
}

for (let completed = 3; completed <= 4; completed += 1) assertOnlyIncreases(completed, 'angle')
for (let completed = 5; completed <= 7; completed += 1) assertOnlyIncreases(completed, 'swingSpeed')
for (let completed = 8; completed <= 10; completed += 1) assertOnlyIncreases(completed, 'angle')
for (let completed = 11; completed <= 13; completed += 1) assertOnlyIncreases(completed, 'platformSpeed')
for (let completed = 14; completed <= 17; completed += 1) assertOnlyIncreases(completed, 'swingSpeed')
for (let completed = 18; completed <= 24; completed += 1) assertOnlyIncreases(completed, 'angle')
for (let completed = 25; completed <= 30; completed += 1) assertOnlyIncreases(completed, 'platformSpeed')

const floorEleven = rules.getDifficultyProfile(10)
assert(nearlyEqual(floorEleven.angle, 48))
assert(nearlyEqual(floorEleven.swingSpeed, 0.92))
const floorEighteen = rules.getDifficultyProfile(17)
assert(nearlyEqual(floorEighteen.swingSpeed, 1))
const expertProfile = rules.getDifficultyProfile(24)
assert(nearlyEqual(expertProfile.angle, 62))

const loadSrcModule = (filename) => {
  const previousLoader = require.extensions['.js']
  require.extensions['.js'] = (module, sourceFilename) => {
    if (sourceFilename.indexOf(`${path.sep}src${path.sep}`) === -1) {
      previousLoader(module, sourceFilename)
      return
    }
    module._compile(babel.transformFileSync(sourceFilename).code, sourceFilename)
  }
  const modulePath = path.resolve(__dirname, '..', 'src', filename)
  delete require.cache[modulePath]
  const loaded = require(modulePath)
  require.extensions['.js'] = previousLoader
  return loaded
}

const sugarRush = loadSrcModule('sugarRush.js')
const inRunProgress = loadSrcModule('inRunProgress.js')
const milestone = loadSrcModule('milestone.js')
const nearMiss = loadSrcModule('nearMissRules.js')
const promptQueue = loadSrcModule('runPromptQueue.js')
const towerDynamics = loadSrcModule('towerDynamics.js')
const gameplayUtils = loadSrcModule('utils.js')

class FakeEngine {
  constructor() {
    this.variables = new Map()
    this.instances = new Map()
    this.width = 390
    this.height = 844
    this.isTouchDevice = true
  }

  setVariable(name, value) {
    this.variables.set(name, value)
  }

  getVariable(name, fallback) {
    return this.variables.has(name) ? this.variables.get(name) : fallback
  }

  getInstance(name) {
    return this.instances.get(name)
  }

  pixelsPerFrame(value) {
    return value / 60
  }
}

const fakeEngine = new FakeEngine()
sugarRush.initializeSugarRush(fakeEngine)
assert.strictEqual(sugarRush.triggerSugarRush(fakeEngine, 3, 0), true)
assert.strictEqual(sugarRush.triggerSugarRush(fakeEngine, 3, 10), false)
assert.strictEqual(fakeEngine.getVariable('SUGAR_RUSH_REMAINING'), 2)
assert(nearlyEqual(sugarRush.getSugarRushSpeedFactor(fakeEngine, 220), 0.9))
for (let cake = 0; cake < 2; cake += 1) {
  const block = {}
  sugarRush.markSugarRushCake(fakeEngine, block)
  assert.strictEqual(block.sugarRush, true)
  assert.strictEqual(sugarRush.getSugarRushMultiplier(block), 2)
  sugarRush.resolveSugarRushCake(fakeEngine, block, 300 + (cake * 100))
  sugarRush.resolveSugarRushCake(fakeEngine, block, 301 + (cake * 100))
  assert.strictEqual(fakeEngine.getVariable('SUGAR_RUSH_REMAINING'), 1 - cake)
}
assert(nearlyEqual(sugarRush.getSugarRushSpeedFactor(fakeEngine, 1200), 1))
assert.strictEqual(sugarRush.triggerSugarRush(fakeEngine, 6, 1300), true)

assert.strictEqual(inRunProgress.getRushCharge(0), 0)
assert.strictEqual(inRunProgress.getRushCharge(2), 2)
assert.strictEqual(inRunProgress.getRushCharge(3), 0)
assert.deepStrictEqual(inRunProgress.getRushDots(2), [true, true, false])
const rushLayout = inRunProgress.getRushHudLayout(390)
assert(nearlyEqual(rushLayout.centerX, 195))
assert(rushLayout.detailY > rushLayout.labelY, 'Rush dots must be on a separate row')
assert(rushLayout.dotXs[0] < rushLayout.dotXs[1])
assert(rushLayout.dotXs[1] < rushLayout.dotXs[2])

assert.strictEqual(milestone.getMilestone(10).label, 'PASTRY PRO')
assert.strictEqual(milestone.getMilestone(11), null)
assert.strictEqual(milestone.getUpcomingMilestone(8).floor, 10)
milestone.initializeMilestones(fakeEngine)
assert.strictEqual(milestone.claimMilestone(fakeEngine, 10).label, 'PASTRY PRO')
assert.strictEqual(milestone.claimMilestone(fakeEngine, 10), null)
assert.strictEqual(milestone.claimTargetPrompt(fakeEngine, 10), true)
assert.strictEqual(milestone.claimTargetPrompt(fakeEngine, 10), false)
const rushReliefBlock = { sugarRush: true }
milestone.markMilestoneReliefCake(fakeEngine, rushReliefBlock)
assert.strictEqual(rushReliefBlock.milestoneRelief, undefined)
assert.strictEqual(fakeEngine.getVariable('MILESTONE_RELIEF_PENDING'), 1)
const reliefBlock = { sugarRush: false }
milestone.markMilestoneReliefCake(fakeEngine, reliefBlock)
assert.strictEqual(reliefBlock.milestoneRelief, true)
assert(nearlyEqual(milestone.getMilestoneReliefFactor(fakeEngine, reliefBlock, 100), 1))
assert(nearlyEqual(milestone.getMilestoneReliefFactor(fakeEngine, reliefBlock, 280), 0.94))
milestone.resolveMilestoneReliefCake(fakeEngine, reliefBlock, 300)
assert(nearlyEqual(milestone.getMilestoneReliefFactor(fakeEngine, {}, 300), 0.94))
assert(nearlyEqual(milestone.getMilestoneReliefFactor(fakeEngine, {}, 600), 1))

fakeEngine.setVariable('BLOCK_COUNT', 7)
fakeEngine.setVariable('SUCCESS_COUNT', 6)
fakeEngine.setVariable('GAME_SCORE', 0)
fakeEngine.setVariable('GAME_USER_OPTION', {})
fakeEngine.setVariable('HARD_MODE', false)
const synchronizedReliefBlock = {
  milestoneRelief: true,
  milestoneReliefStart: 0,
  status: 'SWING'
}
fakeEngine.instances.set('block_7', synchronizedReliefBlock)
const hookVelocity = gameplayUtils.getSwingBlockVelocity(fakeEngine, 180)
const cakeVelocity = gameplayUtils.getSwingBlockVelocity(fakeEngine, 180, synchronizedReliefBlock)
assert(nearlyEqual(hookVelocity, cakeVelocity), 'Hook and cake must share milestone relief timing')

const emptyTowerState = towerDynamics.createTowerState()
assert.deepStrictEqual(emptyTowerState, {
  angle: 0,
  angularVelocity: 0,
  floorCount: 0,
  lastUpdateTime: null
})
assert.strictEqual(towerDynamics.getMaxTowerTopOffset(4, 390), 0)
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(5, 390), 4))
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(9, 390), 10))
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(14, 390), 16))
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(19, 390), 22))
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(25, 390), 28))
assert(nearlyEqual(towerDynamics.getMaxTowerTopOffset(40, 390), 28))
for (let floor = 6; floor <= 25; floor += 1) {
  assert(
    towerDynamics.getMaxTowerTopOffset(floor, 390)
      >= towerDynamics.getMaxTowerTopOffset(floor - 1, 390),
    `Tower offset cap must not fall at floor ${floor}`
  )
}
const activeTower = { ...emptyTowerState, floorCount: 10 }
const rightGreat = towerDynamics.applyTowerLanding(
  activeTower, rules.GREAT, 0.1, 390, 138
)
const leftGood = towerDynamics.applyTowerLanding(
  activeTower, rules.SAFE, -0.25, 390, 138
)
assert(rightGreat.angularVelocity > 0)
assert(leftGood.angularVelocity < 0)
assert(Math.abs(leftGood.angularVelocity) > Math.abs(rightGreat.angularVelocity))
const perfectCalm = towerDynamics.applyTowerLanding(
  { ...activeTower, angularVelocity: 0.2 }, rules.PERFECT, 0, 390, 138
)
assert(nearlyEqual(perfectCalm.angularVelocity, 0.11))
const offsetState = { ...activeTower, angle: 0.01 }
assert.strictEqual(towerDynamics.getTowerLayerOffset(offsetState, 1, 138), 0)
assert(
  towerDynamics.getTowerLayerOffset(offsetState, 10, 138)
    > towerDynamics.getTowerLayerOffset(offsetState, 5, 138)
)
const simulateTower = (fps) => {
  let state = { ...rightGreat }
  const frames = fps * 2
  for (let frame = 0; frame < frames; frame += 1) {
    state = towerDynamics.stepTowerState(state, 1 / fps, 390, 138)
  }
  return towerDynamics.getTowerLayerOffset(state, 10, 138)
}
const offset30 = simulateTower(30)
const offset60 = simulateTower(60)
const offset120 = simulateTower(120)
assert(Math.abs(offset30 - offset60) <= 0.25)
assert(Math.abs(offset60 - offset120) <= 0.25)

const towerEngine = new FakeEngine()
towerEngine.setVariable('BLOCK_HEIGHT', 138)
towerDynamics.initializeTowerDynamics(towerEngine)
towerDynamics.updateTowerDynamics(towerEngine, 100)
assert.strictEqual(towerEngine.getVariable('TOWER_DYNAMICS_STATE').lastUpdateTime, 100)
towerEngine.setVariable('TOWER_DYNAMICS_STATE', {
  angle: 0.01,
  angularVelocity: 0,
  floorCount: 9,
  lastUpdateTime: 100
})
const landingBlock = { x: 100, width: 100, calWidth: 50 }
const towerLine = { x: 0, collisionX: 100 }
towerDynamics.registerTowerLanding(towerEngine, landingBlock, towerLine, 10)
assert(nearlyEqual(towerDynamics.getTowerBlockX(towerEngine, landingBlock), 100))
assert(nearlyEqual(towerLine.x + landingBlock.calWidth, 100))
towerDynamics.applyTowerLandingFeedback(towerEngine, rules.GREAT, 0.1)
towerDynamics.updateTowerDynamics(towerEngine, 116.6667)
assert(nearlyEqual(
  towerDynamics.getTowerLineX(towerEngine, towerLine) + landingBlock.calWidth,
  towerDynamics.getTowerBlockX(towerEngine, landingBlock)
))

assert.strictEqual(nearMiss.getNearMissSide({ x: -8, width: 100 }, { x: 0, collisionX: 100 }), 'left')
assert.strictEqual(nearMiss.getNearMissSide({ x: -13, width: 100 }, { x: 0, collisionX: 100 }), null)
assert.strictEqual(nearMiss.getNearMissSide({ x: 108, width: 100 }, { x: 0, collisionX: 100 }), 'right')

let queue = promptQueue.enqueuePrompt([], { id: 'target-10', priority: 1 })
queue = promptQueue.enqueuePrompt(queue, { id: 'rush-3', priority: 3 })
queue = promptQueue.enqueuePrompt(queue, { id: 'target-10', priority: 1 })
assert.strictEqual(queue.length, 2)
assert.strictEqual(promptQueue.dequeuePrompt(queue).prompt.id, 'rush-3')

const feedbackSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'landingFeedback.js'),
  'utf8'
)
assert(feedbackSource.includes("label: 'GOOD!'"), 'SAFE must be presented as GOOD!')
assert(!feedbackSource.includes("label: 'SAFE'"), 'SAFE must not be shown to players')
assert(feedbackSource.includes('Math.min(combo, 6)'), 'PERFECT pitch must be capped at combo 6')

const releaseAssets = require(path.resolve(__dirname, 'release-assets.js'))
assert(releaseAssets.includes('sugar-rush.wav'), 'Rush audio must be published')

const promptSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'runPrompt.js'),
  'utf8'
)
assert(!promptSource.includes('createElement'), 'Run prompts must stay on Canvas')
assert(promptSource.includes("'#FFF7E8'"), 'Run prompts must reuse the cream palette')
assert(promptSource.includes("'#F4C76A'"), 'Run prompts must reuse the sugar-gold palette')
assert(
  promptSource.includes('engine.width * 0.042'),
  'Rush HUD label must remain visually prominent'
)

console.log('Core gameplay rules verified')
