import { Instance } from 'cooljs'
import { blockAction, blockPainter } from './block'
import {
  checkMoveDown,
  getMoveDownValue,
  drawYellowString,
  getAngleBase
} from './utils'
import { addFlight } from './flight'
import { markSugarRushCake } from './sugarRush'
import { assignCakeStyle } from './cakeCollection'
import { markMilestoneReliefCake } from './milestone'
import { drawRushProgress } from './runPrompt'
import { updateTowerDynamics } from './towerDynamics'
import * as constant from './constant'

export const endAnimate = (engine) => {
  const gameStartNow = engine.getVariable(constant.gameStartNow)
  if (!gameStartNow) return
  const successCount = engine.getVariable(constant.successCount, 0)
  const failedCount = engine.getVariable(constant.failedCount)
  const gameScore = engine.getVariable(constant.gameScore, 0)
  const { ctx } = engine

  const drawRoundedPanel = (x, y, width, height, radius) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  const panelX = engine.width * 0.6
  const panelY = engine.width * 0.035
  const panelWidth = engine.width * 0.36
  const panelHeight = engine.width * 0.125
  ctx.save()
  ctx.fillStyle = 'rgba(255, 247, 232, 0.9)'
  ctx.strokeStyle = 'rgba(107, 58, 53, 0.42)'
  ctx.lineWidth = Math.max(1, engine.width * 0.005)
  drawRoundedPanel(panelX, panelY, panelWidth, panelHeight, engine.width * 0.035)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  drawYellowString(engine, {
    string: 'FLOOR',
    size: engine.width * 0.052,
    x: engine.width * 0.23,
    y: engine.width * 0.1,
    textAlign: 'left',
    fontName: 'Arial',
    fontWeight: 'bold'
  })
  drawYellowString(engine, {
    string: successCount,
    size: engine.width * 0.17,
    x: engine.width * 0.075,
    y: engine.width * 0.215,
    textAlign: 'left'
  })
  const scoreLength = String(gameScore).length
  const scoreSize = scoreLength > 4 ? 0.047 : scoreLength > 3 ? 0.052 : 0.058
  drawYellowString(engine, {
    string: `SCORE ${gameScore}`,
    size: engine.width * scoreSize,
    x: panelX + (panelWidth / 2),
    y: engine.width * 0.113,
    textAlign: 'center',
    fontName: '"Arial Rounded MT Bold", "Trebuchet MS", Arial',
    fontWeight: '900'
  })
  const heart = engine.getImg('heart')
  const heartWidth = heart.width
  const heartHeight = heart.height
  const zoomedHeartWidth = engine.width * 0.09
  const zoomedHeartHeight = (heartHeight * zoomedHeartWidth) / heartWidth
  for (let i = 1; i <= 3; i += 1) {
    ctx.save()
    if (i <= failedCount) {
      ctx.globalAlpha = 0.2
    }
    ctx.drawImage(
      heart,
      (engine.width * 0.635) + ((i - 1) * engine.width * 0.095),
      engine.width * 0.18,
      zoomedHeartWidth,
      zoomedHeartHeight
    )
    ctx.restore()
  }
  drawRushProgress(engine)
}

export const startAnimate = (engine) => {
  const gameStartNow = engine.getVariable(constant.gameStartNow)
  if (!gameStartNow) return
  updateTowerDynamics(engine, engine.lastTime || engine.utils.getCurrentTime())
  const lastBlock = engine.getInstance(`block_${engine.getVariable(constant.blockCount)}`)
  if (!lastBlock || [constant.land, constant.out].indexOf(lastBlock.status) > -1) {
    if (checkMoveDown(engine) && getMoveDownValue(engine)) return
    if (engine.checkTimeMovement(constant.hookUpMovement)) return
    const angleBase = getAngleBase(engine)
    const initialAngle = (Math.PI
        * engine.utils.random(angleBase, angleBase + 5)
        * engine.utils.randomPositiveNegative()
    ) / 180
    engine.setVariable(constant.blockCount, engine.getVariable(constant.blockCount) + 1)
    engine.setVariable(constant.initialAngle, initialAngle)
    engine.setTimeMovement(constant.hookDownMovement, 500)
    const block = new Instance({
      name: `block_${engine.getVariable(constant.blockCount)}`,
      action: blockAction,
      painter: blockPainter
    })
    markSugarRushCake(engine, block)
    markMilestoneReliefCake(engine, block)
    assignCakeStyle(engine, block)
    engine.addInstance(block)
  }
  const successCount = Number(engine.getVariable(constant.successCount, 0))
  switch (successCount) {
    case 2:
      addFlight(engine, 1, 'leftToRight')
      break
    case 6:
      addFlight(engine, 2, 'rightToLeft')
      break
    case 8:
      addFlight(engine, 3, 'leftToRight')
      break
    case 14:
      addFlight(engine, 4, 'bottomToTop')
      break
    case 18:
      addFlight(engine, 5, 'bottomToTop')
      break
    case 22:
      addFlight(engine, 6, 'bottomToTop')
      break
    case 25:
      addFlight(engine, 7, 'rightTopToLeft')
      break
    default:
      break
  }
}
