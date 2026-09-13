import * as constant from './constant'
import { getDifficultyProfile, getNextPerfectCombo, getScoreDelta } from './gameplayRules'
import { getSugarRushSpeedFactor } from './sugarRush'
import { getMilestoneReliefFactor } from './milestone'

export const checkMoveDown = engine =>
  (engine.checkTimeMovement(constant.moveDownMovement))

export const getMoveDownValue = (engine, store) => {
  const pixelsPerFrame = store ? store.pixelsPerFrame : engine.pixelsPerFrame.bind(engine)
  const calHeight = engine.getVariable(constant.blockHeight) * 2
  return pixelsPerFrame(calHeight)
}

const useMobileDifficulty = engine => (
  engine.isTouchDevice || engine.height > engine.width * 1.35
)

const getCurrentBlock = engine => engine.getInstance(
  `block_${engine.getVariable(constant.blockCount)}`
)

const getTempoRewardFactor = (engine, time, block) => Math.max(
  0.9,
  getSugarRushSpeedFactor(engine, time)
    * getMilestoneReliefFactor(engine, block || getCurrentBlock(engine), time)
)

export const getAngleBase = (engine) => {
  const successCount = engine.getVariable(constant.successCount)
  const gameScore = engine.getVariable(constant.gameScore)
  const { hookAngle } = engine.getVariable(constant.gameUserOption)
  if (hookAngle) {
    return hookAngle(successCount, gameScore)
  }
  return getDifficultyProfile(
    successCount,
    engine.getVariable(constant.hardMode) && !useMobileDifficulty(engine)
  ).angle
}

export const getSwingBlockVelocity = (engine, time, block) => {
  const successCount = engine.getVariable(constant.successCount)
  const gameScore = engine.getVariable(constant.gameScore)
  const { hookSpeed } = engine.getVariable(constant.gameUserOption)
  const rewardFactor = getTempoRewardFactor(engine, time, block)
  if (hookSpeed) {
    return hookSpeed(successCount, gameScore) * rewardFactor
  }
  const profile = getDifficultyProfile(
    successCount,
    engine.getVariable(constant.hardMode) && !useMobileDifficulty(engine)
  )
  const hard = profile.swingSpeed * rewardFactor
  if (hard === 0) return 0
  return Math.sin(time / (200 / hard))
}

export const getHookStatus = (engine) => {
  if (engine.checkTimeMovement(constant.hookDownMovement)) {
    return constant.hookDown
  }
  if (engine.checkTimeMovement(constant.hookUpMovement)) {
    return constant.hookUp
  }
  return constant.hookNormal
}

export const touchEventHandler = (engine) => {
  if (!engine.getVariable(constant.gameStartNow)) return
  if (engine.debug && engine.paused) {
    return
  }
  if (getHookStatus(engine) !== constant.hookNormal) {
    return
  }
  engine.removeInstance('tutorial')
  engine.removeInstance('tutorial-arrow')
  const b = engine.getInstance(`block_${engine.getVariable(constant.blockCount)}`)
  if (b && b.status === constant.swing) {
    engine.setTimeMovement(constant.hookUpMovement, 500)
    b.status = constant.beforeDrop
  }
}

export const addSuccessCount = (engine) => {
  const { setGameSuccess } = engine.getVariable(constant.gameUserOption)
  const lastSuccessCount = engine.getVariable(constant.successCount)
  const success = lastSuccessCount + 1
  engine.setVariable(constant.successCount, success)
  if (setGameSuccess) setGameSuccess(success)
}

export const addFailedCount = (engine) => {
  const { setGameFailed } = engine.getVariable(constant.gameUserOption)
  const lastFailedCount = engine.getVariable(constant.failedCount)
  const failed = lastFailedCount + 1
  engine.setVariable(constant.failedCount, failed)
  engine.setVariable(constant.perfectCount, 0)
  if (setGameFailed) setGameFailed(failed)
  if (failed >= 3) {
    engine.pauseAudio('bgm')
    engine.playAudio('game-over')
    engine.setVariable(constant.gameStartNow, false)
  }
}

export const addScore = (engine, rating, multiplier = 1) => {
  const { setGameScore, successScore, perfectScore } = engine.getVariable(constant.gameUserOption)
  const lastPerfectCount = engine.getVariable(constant.perfectCount, 0)
  const lastGameScore = engine.getVariable(constant.gameScore)
  const perfect = getNextPerfectCombo(rating, lastPerfectCount)
  const score = lastGameScore + getScoreDelta(
    rating,
    perfect,
    multiplier,
    successScore || 25,
    perfectScore || 25
  )
  engine.setVariable(constant.gameScore, score)
  engine.setVariable(constant.perfectCount, perfect)
  if (setGameScore) setGameScore(score)
  return { score, combo: perfect }
}

export const drawYellowString = (engine, option) => {
  const {
    string, size, x, y, textAlign, fontName = 'wenxue', fontWeight = 'normal'
  } = option
  const { ctx } = engine
  const fontSize = size
  const lineSize = fontSize * 0.1
  ctx.save()
  ctx.beginPath()
  const gradient = ctx.createLinearGradient(0, 0, 0, y)
  gradient.addColorStop(0, '#F4C76A')
  gradient.addColorStop(1, '#D9486E')
  ctx.fillStyle = gradient
  ctx.lineWidth = lineSize
  ctx.strokeStyle = '#FFF7E8'
  ctx.textAlign = textAlign || 'center'
  ctx.font = `${fontWeight} ${fontSize}px ${fontName}`
  ctx.strokeText(string, x, y)
  ctx.fillText(string, x, y)
  ctx.restore()
}
