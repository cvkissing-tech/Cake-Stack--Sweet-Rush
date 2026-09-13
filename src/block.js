import {
  getMoveDownValue,
  getSwingBlockVelocity,
  touchEventHandler,
  addSuccessCount,
  addFailedCount,
  addScore
} from './utils'
import { getLandingRating, PERFECT } from './gameplayRules'
import {
  addLandingFeedback,
  playSugarRushAudio,
  startLandingImpact,
  updateLandingImpact
} from './landingFeedback'
import {
  getSugarRushMultiplier,
  resolveSugarRushCake,
  triggerSugarRush
} from './sugarRush'
import {
  claimMilestone,
  claimTargetPrompt,
  getUpcomingMilestone,
  resolveMilestoneReliefCake
} from './milestone'
import { queueRunPrompt, promptPriority } from './runPrompt'
import { getNearMissSide } from './nearMissRules'
import { addNearMissFeedback } from './nearMissFeedback'
import {
  applyTowerLandingFeedback,
  getTowerBlockX,
  getTowerRiskRatio,
  registerTowerLanding
} from './towerDynamics'
import {
  queueCakeRewards,
  recordCakeLanding
} from './cakeCollection'
import * as constant from './constant'

const checkCollision = (block, line, landingForgiveness = 0) => {
  // 0 continue, 1 miss, 2 rotate left, 3 rotate right, 4 successful landing
  if (block.y + block.height >= line.y) {
    if (block.x < line.x - block.calWidth || block.x > line.collisionX + block.calWidth) {
      return 1
    }
    if (block.x < line.x - landingForgiveness) {
      return 2
    }
    if (block.x > line.collisionX + landingForgiveness) {
      return 3
    }
    return 4
  }
  return 0
}
const swing = (instance, engine, time) => {
  const ropeHeight = engine.getVariable(constant.ropeHeight)
  if (instance.status !== constant.swing) return
  const i = instance
  const initialAngle = engine.getVariable(constant.initialAngle)
  i.angle = initialAngle *
    getSwingBlockVelocity(engine, time, instance)
  i.weightX = i.x +
    (Math.sin(i.angle) * ropeHeight)
  i.weightY = i.y +
    (Math.cos(i.angle) * ropeHeight)
}

const checkBlockOut = (instance, engine, time) => {
  if (instance.status === constant.rotateLeft) {
    // 左转 要等右上角消失才算消失
    if (instance.y - instance.width >= engine.height) {
      instance.visible = false
      instance.status = constant.out
      resolveSugarRushCake(engine, instance, time)
      resolveMilestoneReliefCake(engine, instance, time)
      addFailedCount(engine)
    }
  } else if (instance.y >= engine.height) {
    instance.visible = false
    instance.status = constant.out
    resolveSugarRushCake(engine, instance, time)
    resolveMilestoneReliefCake(engine, instance, time)
    addFailedCount(engine)
  }
}

export const blockAction = (instance, engine, time) => {
  const i = instance
  const ropeHeight = engine.getVariable(constant.ropeHeight)
  if (!i.visible) {
    return
  }
  if (!i.ready) {
    i.ready = true
    i.status = constant.swing
    instance.updateWidth(engine.getVariable(constant.blockWidth))
    instance.updateHeight(engine.getVariable(constant.blockHeight))
    instance.x = engine.width / 2
    instance.y = ropeHeight * -1.5
  }
  const line = engine.getInstance('line')
  switch (i.status) {
    case constant.swing:
      engine.getTimeMovement(
        constant.hookDownMovement,
        [[instance.y, instance.y + ropeHeight]],
        (value) => {
          instance.y = value
        },
        {
          name: 'block'
        }
      )
      swing(instance, engine, time)
      break
    case constant.beforeDrop:
      i.x = instance.weightX - instance.calWidth
      i.y = instance.weightY + (0.3 * instance.height) // add rope height
      i.rotate = 0
      // Express gravity directly in pixels/ms^2. The old implementation ran
      // it through pixelsPerFrame and then multiplied by deltaTime again,
      // making cakes fall much faster on low-frame-rate phones.
      i.vy = 0
      i.ay = 0.000005 * engine.height
      i.startDropTime = time
      i.status = constant.drop
      break
    case constant.drop:
      const deltaTime = time - i.startDropTime
      i.startDropTime = time
      i.y += (i.vy * deltaTime) + (0.5 * i.ay * (deltaTime ** 2))
      i.vy += i.ay * deltaTime
      const isTallPortrait = engine.height > engine.width * 1.55
      const landingForgiveness = isTallPortrait ? instance.width * 0.1 : 0
      const collision = checkCollision(instance, line, landingForgiveness)
      const blockY = line.y - instance.height
      const calRotate = (ins) => {
        ins.originOutwardAngle = Math.atan(ins.height / ins.outwardOffset)
        ins.originHypotenuse = Math.sqrt((ins.height ** 2)
          + (ins.outwardOffset ** 2))
        engine.playAudio('rotate')
      }
      switch (collision) {
        case 1:
          checkBlockOut(instance, engine, time)
          break
        case 2:
          i.status = constant.rotateLeft
          instance.y = blockY
          addNearMissFeedback(
            engine,
            instance,
            getNearMissSide(instance, line, landingForgiveness)
          )
          instance.outwardOffset = (line.x + instance.calWidth) - instance.x
          calRotate(instance)
          break
        case 3:
          i.status = constant.rotateRight
          instance.y = blockY
          addNearMissFeedback(
            engine,
            instance,
            getNearMissSide(instance, line, landingForgiveness)
          )
          instance.outwardOffset = (line.collisionX + instance.calWidth) - instance.x
          calRotate(instance)
          break
        case 4:
          i.status = constant.land
          const lastSuccessCount = engine.getVariable(constant.successCount)
          const rating = getLandingRating(
            instance.x,
            instance.width,
            line.x,
            line.collisionX - line.x
          )
          const targetCenter = line.x + ((line.collisionX - line.x) / 2)
          const landingErrorRatio = (instance.x - targetCenter) / instance.width
          const multiplier = getSugarRushMultiplier(instance)
          addSuccessCount(engine)
          engine.setTimeMovement(constant.moveDownMovement, 500)
          if (lastSuccessCount === 10 || lastSuccessCount === 15) {
            engine.setTimeMovement(constant.lightningMovement, 150)
          }
          instance.y = blockY
          line.y = blockY
          // 作弊检测 超出左边或右边1／3
          const cheatWidth = i.width * 0.3
          if (i.x > engine.width - (cheatWidth * 2)
            || i.x < -cheatWidth) {
            engine.setVariable(constant.hardMode, true)
          }
          instance.perfect = rating === PERFECT
          instance.landingRating = rating
          const scoreResult = addScore(engine, rating, multiplier)
          const rushTriggered = triggerSugarRush(engine, scoreResult.combo, time)
          if (rushTriggered) {
            playSugarRushAudio(engine)
            queueRunPrompt(engine, {
              id: `rush-${scoreResult.combo}`,
              priority: promptPriority.RUSH,
              type: 'rush',
              text: 'SUGAR RUSH',
              subtitle: '2 CAKES · SCORE ×2',
              duration: 920
            }, time)
          } else if (scoreResult.combo > 0 && scoreResult.combo % 3 === 2) {
            queueRunPrompt(engine, {
              id: `one-more-${Math.floor(scoreResult.combo / 3)}`,
              priority: promptPriority.ONE_MORE,
              type: 'oneMore',
              text: 'ONE MORE!'
            }, time)
          }
          const currentFloor = lastSuccessCount + 1
          const towerRisk = getTowerRiskRatio(engine)
          const milestone = claimMilestone(engine, currentFloor)
          if (milestone) {
            queueRunPrompt(engine, {
              id: `milestone-${milestone.floor}`,
              priority: promptPriority.MILESTONE,
              type: 'milestone',
              text: milestone.label,
              subtitle: `FLOOR ${milestone.floor}`,
              duration: 940
            }, time)
          }
          const upcoming = getUpcomingMilestone(currentFloor)
          if (upcoming && upcoming.floor - currentFloor === 2
            && claimTargetPrompt(engine, upcoming.floor)) {
            queueRunPrompt(engine, {
              id: `target-${upcoming.floor}`,
              priority: promptPriority.TARGET,
              type: 'target',
              text: `2 FLOORS TO ${upcoming.label}`,
              duration: 760
            }, time)
          }
          startLandingImpact(instance, rating, time)
          addLandingFeedback(engine, instance, {
            rating,
            combo: scoreResult.combo,
            rushTriggered,
            sugarRushCake: instance.sugarRush
          })
          recordCakeLanding(engine, instance, {
            rating,
            floor: currentFloor,
            combo: scoreResult.combo,
            towerRisk
          })
          queueCakeRewards(engine, {
            combo: scoreResult.combo,
            floor: currentFloor,
            rating,
            towerRisk
          })
          registerTowerLanding(engine, instance, line, currentFloor)
          applyTowerLandingFeedback(engine, rating, landingErrorRatio)
          resolveSugarRushCake(engine, instance, time)
          resolveMilestoneReliefCake(engine, instance, time)
          break
        default:
          break
      }
      break
    case constant.land:
      updateLandingImpact(instance, time)
      engine.getTimeMovement(
        constant.moveDownMovement,
        [[instance.y, instance.y + (getMoveDownValue(engine, { pixelsPerFrame: s => s / 2 }))]],
        (value) => {
          if (!instance.visible) return
          instance.y = value
          if (instance.y > engine.height) {
            instance.visible = false
          }
        },
        {
          name: instance.name
        }
      )
      break
    case constant.rotateLeft:
    case constant.rotateRight:
      const isRight = i.status === constant.rotateRight
      const rotateSpeed = engine.pixelsPerFrame(Math.PI * 4)
      const isShouldFall = isRight ? instance.rotate > 1.3 : instance.rotate < -1.3// 75度
      const leftFix = isRight ? 1 : -1
      if (isShouldFall) {
        instance.rotate += (rotateSpeed / 8) * leftFix
        instance.y += engine.pixelsPerFrame(engine.height * 0.7)
        instance.x += engine.pixelsPerFrame(engine.width * 0.3) * leftFix
      } else {
        let rotateRatio = (instance.calWidth - instance.outwardOffset)
          / instance.calWidth
        rotateRatio = rotateRatio > 0.5 ? rotateRatio : 0.5
        instance.rotate += rotateSpeed * rotateRatio * leftFix
        const angle = instance.originOutwardAngle + instance.rotate
        const rotateAxisX = isRight ? line.collisionX + instance.calWidth
          : line.x + instance.calWidth
        const rotateAxisY = line.y
        instance.x = rotateAxisX -
          (Math.cos(angle) * instance.originHypotenuse)
        instance.y = rotateAxisY -
          (Math.sin(angle) * instance.originHypotenuse)
      }
      checkBlockOut(instance, engine, time)
      break
    default:
      break
  }
}

const drawSwingBlock = (instance, engine) => {
  const rope = engine.getImg('blockRope')
  const cake = engine.getImg(instance.cakeStyleId || 'cake-strawberry')
  const drawX = instance.weightX - instance.calWidth
  const totalHeight = instance.height * 1.3
  const ropeHeight = totalHeight - instance.height
  const ropeSourceHeight = Math.max(1, rope.height - 134)
  engine.ctx.drawImage(
    rope,
    0,
    0,
    rope.width,
    ropeSourceHeight,
    drawX,
    instance.weightY,
    instance.width,
    ropeHeight + 1
  )
  engine.ctx.drawImage(
    cake,
    drawX,
    instance.weightY + ropeHeight,
    instance.width,
    instance.height
  )
  const leftX = instance.weightX - instance.calWidth
  engine.debugLineY(leftX)
}

const drawPerfectSparkles = (ctx, width, height) => {
  const points = [
    [width * -0.27, height * -0.62, width * 0.035],
    [width * 0.23, height * -0.38, width * 0.026],
    [width * -0.02, height * -0.78, width * 0.022]
  ]
  ctx.save()
  ctx.fillStyle = '#FFF2A8'
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = Math.max(1, width * 0.012)
  points.forEach(([x, y, size]) => {
    ctx.beginPath()
    ctx.moveTo(x, y - size)
    ctx.lineTo(x + (size * 0.34), y - (size * 0.34))
    ctx.lineTo(x + size, y)
    ctx.lineTo(x + (size * 0.34), y + (size * 0.34))
    ctx.lineTo(x, y + size)
    ctx.lineTo(x - (size * 0.34), y + (size * 0.34))
    ctx.lineTo(x - size, y)
    ctx.lineTo(x - (size * 0.34), y - (size * 0.34))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  })
  ctx.restore()
}

const drawBlock = (instance, engine) => {
  const { perfect } = instance
  const bl = engine.getImg(instance.cakeStyleId || 'cake-strawberry')
  const scaleX = instance.impactScaleX || 1
  const scaleY = instance.impactScaleY || 1
  const { ctx } = engine
  const drawX = instance.status === constant.land
    ? getTowerBlockX(engine, instance)
    : instance.x
  ctx.save()
  ctx.translate(drawX + (instance.width / 2), instance.y + instance.height)
  ctx.scale(scaleX, scaleY)
  ctx.drawImage(bl, instance.width / -2, -instance.height, instance.width, instance.height)
  if (perfect) drawPerfectSparkles(ctx, instance.width, instance.height)
  ctx.restore()
}

const drawRotatedBlock = (instance, engine) => {
  const { ctx } = engine
  ctx.save()
  ctx.translate(instance.x, instance.y)
  ctx.rotate(instance.rotate)
  ctx.translate(-instance.x, -instance.y)
  drawBlock(instance, engine)
  ctx.restore()
}

export const blockPainter = (instance, engine) => {
  const { status } = instance
  switch (status) {
    case constant.swing:
      drawSwingBlock(instance, engine)
      break
    case constant.drop:
    case constant.land:
      drawBlock(instance, engine)
      break
    case constant.rotateLeft:
    case constant.rotateRight:
      drawRotatedBlock(instance, engine)
      break
    default:
      break
  }
}
