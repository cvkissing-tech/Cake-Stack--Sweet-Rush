import * as constant from './constant'

const randomCloudImg = (instance) => {
  const decorations = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
  const randomImg = array => (array[Math.floor(Math.random() * array.length)])
  instance.imgName = randomImg(decorations)
}

export const cloudAction = (instance, engine, time) => {
  if (!instance.ready) {
    instance.ready = true
    randomCloudImg(instance)
    instance.width = engine.getVariable(constant.cloudSize)
    instance.height = engine.getVariable(constant.cloudSize)
    const engineW = engine.width
    const engineH = engine.height
    const verticalSlots = [0.18, 0.38, 0.58, 0.76]
    const sidePadding = engineW * 0.035
    instance.sideDirection = instance.index % 2 === 1 ? 1 : -1
    instance.originX = instance.sideDirection > 0
      ? sidePadding
      : engineW - instance.width - sidePadding
    instance.originY = (engineH * verticalSlots[instance.index - 1])
      + engine.utils.random(engineH * -0.035, engineH * 0.035)
    instance.phase = engine.utils.random(0, Math.PI * 2)
    instance.travelPhase = (instance.index - 1) * (Math.PI / 2)
    instance.motionRate = engine.utils.random(0.00055, 0.00085)
    instance.opacity = 0
    instance.wasActive = false
  }
  const backgroundOffset = engine.getVariable(constant.bgImgOffset, 0)
  const extensionActive = backgroundOffset >= engine.height * 0.55
  const displayCycle = Math.floor(time / 8000)
  const displayCounts = [1, 2, 3, 2]
  const activeCount = displayCounts[displayCycle % displayCounts.length]
  const activeOffset = displayCycle % 4
  const relativeIndex = (instance.index - 1 - activeOffset + 4) % 4
  const shouldShow = extensionActive && relativeIndex < activeCount
  if (shouldShow && !instance.wasActive) randomCloudImg(instance)
  instance.wasActive = shouldShow
  const successCount = engine.getVariable(constant.successCount, 0)
  const stageOpacity = successCount >= 20 ? 0.82 : successCount >= 12 ? 0.76 : 0.72
  const targetOpacity = shouldShow ? stageOpacity : 0
  instance.opacity += (targetOpacity - instance.opacity) * 0.035

  const progress = (time * instance.motionRate) + instance.phase
  const travelProgress = (time * 0.00018) + instance.travelPhase
  const travel = Math.pow(Math.max(0, Math.sin(travelProgress)), 10)
  instance.x = instance.originX
    + (instance.sideDirection * travel * engine.width * 0.24)
    + (Math.sin(progress) * instance.width * 0.08)
  instance.y = instance.originY + (Math.cos(progress * 0.78) * instance.height * 0.07)
  instance.rotate = Math.sin((progress * 0.62) + instance.phase) * 0.05
  instance.scale = 1 + (Math.cos((progress * 0.9) + instance.phase) * 0.025)
}

export const cloudPainter = (instance, engine) => {
  const { ctx } = engine
  if (instance.opacity < 0.01) return
  const cloud = engine.getImg(instance.imgName)
  ctx.save()
  ctx.globalAlpha = instance.opacity
  ctx.translate(instance.x + (instance.width / 2), instance.y + (instance.height / 2))
  ctx.rotate(instance.rotate || 0)
  ctx.scale(instance.scale || 1, instance.scale || 1)
  ctx.drawImage(cloud, instance.width / -2, instance.height / -2, instance.width, instance.height)
  ctx.restore()
}
