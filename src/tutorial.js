import { getHookStatus } from './utils'
import * as constant from './constant'

const roundedRect = (ctx, x, y, width, height, radius) => {
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

export const tutorialAction = (instance, engine, time) => {
  if (!instance.ready) {
    instance.ready = true
    instance.width = engine.width * 0.42
    instance.height = engine.width * 0.12
    instance.x = (engine.width - instance.width) / 2
    instance.y = engine.height * 0.43
    if (instance.name !== 'tutorial') instance.y += instance.height * 1.15
  }
  if (instance.name !== 'tutorial') {
    instance.y += Math.cos(time / 200) * engine.width * 0.0015
  }
}

export const tutorialPainter = (instance, engine) => {
  if (engine.checkTimeMovement(constant.tutorialMovement)) return
  if (getHookStatus(engine) !== constant.hookNormal) return
  const { ctx } = engine
  if (instance.name === 'tutorial') {
    ctx.save()
    roundedRect(ctx, instance.x, instance.y, instance.width, instance.height, instance.height / 2)
    ctx.fillStyle = 'rgba(255, 247, 232, 0.94)'
    ctx.fill()
    ctx.lineWidth = Math.max(2, engine.width * 0.007)
    ctx.strokeStyle = '#6B3A35'
    ctx.stroke()
    ctx.fillStyle = '#D9486E'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold ' + (engine.width * 0.044) + 'px Arial'
    ctx.fillText('TAP TO DROP', engine.width / 2, instance.y + (instance.height / 2))
    ctx.restore()
    return
  }
  const centerX = engine.width / 2
  const top = instance.y
  const bottom = top + instance.height * 0.72
  ctx.save()
  ctx.strokeStyle = '#D9486E'
  ctx.fillStyle = '#D9486E'
  ctx.lineWidth = Math.max(3, engine.width * 0.01)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(centerX, top)
  ctx.lineTo(centerX, bottom)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX, top + instance.height)
  ctx.lineTo(centerX - instance.height * 0.22, bottom)
  ctx.lineTo(centerX + instance.height * 0.22, bottom)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
