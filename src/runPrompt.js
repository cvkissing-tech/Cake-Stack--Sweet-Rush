import { Instance } from 'cooljs'
import * as constant from './constant'
import { getRushDots, getRushHudLayout } from './inRunProgress'
import { enqueuePrompt, dequeuePrompt } from './runPromptQueue'

export const promptPriority = {
  RUSH: 3,
  MILESTONE: 2,
  ONE_MORE: 1.5,
  TARGET: 1
}

const promptStyles = {
  rush: { top: '#FFD76A', bottom: '#FF5F8B', particles: 10 },
  milestone: { top: '#FFF0B8', bottom: '#F4C76A', particles: 8 },
  oneMore: { top: '#FFD76A', bottom: '#D9486E', particles: 4 },
  target: { top: '#B9F4D9', bottom: '#45BFA0', particles: 0 }
}

export const initializeRunPrompts = (engine) => {
  engine.setVariable(constant.runPromptQueue, [])
  engine.setVariable(constant.runPromptSeen, [])
}

export const queueRunPrompt = (engine, prompt, time) => {
  const seen = engine.getVariable(constant.runPromptSeen, [])
  if (seen.indexOf(prompt.id) > -1) return false
  const queued = enqueuePrompt(engine.getVariable(constant.runPromptQueue, []), {
    duration: 860,
    delay: 840,
    type: 'target',
    ...prompt,
    readyAt: time + (typeof prompt.delay === 'number' ? prompt.delay : 840)
  })
  engine.setVariable(constant.runPromptQueue, queued)
  engine.setVariable(constant.runPromptSeen, seen.concat([prompt.id]))
  return true
}

const runPromptAction = (instance, engine, time) => {
  if (instance.activePrompt) {
    instance.elapsed = time - instance.activePrompt.startTime
    if (instance.elapsed >= instance.activePrompt.duration) {
      instance.activePrompt = null
      instance.elapsed = 0
    }
    return
  }
  const queue = engine.getVariable(constant.runPromptQueue, [])
  if (!queue.length || queue[0].readyAt > time) return
  const next = dequeuePrompt(queue)
  engine.setVariable(constant.runPromptQueue, next.queue)
  instance.activePrompt = { ...next.prompt, startTime: time }
  instance.elapsed = 0
}

const drawSugarDiamond = (ctx, x, y, size, angle, alpha, color) => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, size * -1.3)
  ctx.lineTo(size * 0.52, size * -0.52)
  ctx.lineTo(size * 1.3, 0)
  ctx.lineTo(size * 0.52, size * 0.52)
  ctx.lineTo(0, size * 1.3)
  ctx.lineTo(size * -0.52, size * 0.52)
  ctx.lineTo(size * -1.3, 0)
  ctx.lineTo(size * -0.52, size * -0.52)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const runPromptPainter = (instance, engine) => {
  const prompt = instance.activePrompt
  if (!prompt) return
  const { ctx } = engine
  const style = promptStyles[prompt.type] || promptStyles.target
  const progress = Math.min((instance.elapsed || 0) / prompt.duration, 1)
  const fade = progress < 0.7 ? 1 : Math.max(0, (1 - progress) / 0.3)
  const pop = Math.min(progress / 0.28, 1)
  const scale = pop < 0.65 ? 0.72 + ((pop / 0.65) * 0.44) : 1.16 - (((pop - 0.65) / 0.35) * 0.16)
  const centerX = engine.width / 2
  const centerY = engine.height * 0.41
  const size = engine.width * (prompt.type === 'target' ? 0.052 : 0.068)

  if ((prompt.type === 'rush' || prompt.type === 'milestone') && progress < 0.12) {
    ctx.save()
    ctx.fillStyle = `rgba(255, 240, 184, ${(0.12 - progress) * 0.42})`
    ctx.fillRect(0, 0, engine.width, engine.height)
    ctx.restore()
  }

  for (let index = 0; index < style.particles; index += 1) {
    const angle = ((Math.PI * 2) / style.particles) * index
    const distance = engine.width * (0.07 + (progress * 0.11))
    drawSugarDiamond(
      ctx,
      centerX + (Math.cos(angle) * distance),
      centerY + (Math.sin(angle) * distance * 0.5),
      engine.width * 0.006,
      angle + progress,
      (1 - progress) * fade,
      index % 2 ? '#FF6F91' : '#F4C76A'
    )
  }

  ctx.save()
  ctx.globalAlpha = fade
  ctx.translate(centerX, centerY)
  ctx.scale(scale, scale)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
  ctx.lineWidth = engine.width * 0.014
  ctx.strokeStyle = '#FFF7E8'
  ctx.shadowColor = 'rgba(107, 58, 53, 0.38)'
  ctx.shadowBlur = engine.width * 0.018
  ctx.strokeText(prompt.text, 0, 0)
  const gradient = ctx.createLinearGradient(0, size * -0.65, 0, size * 0.65)
  gradient.addColorStop(0, style.top)
  gradient.addColorStop(1, style.bottom)
  ctx.fillStyle = gradient
  ctx.fillText(prompt.text, 0, 0)
  if (prompt.subtitle) {
    const subtitleSize = engine.width * 0.035
    ctx.font = `900 ${subtitleSize}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
    ctx.lineWidth = engine.width * 0.009
    ctx.strokeText(prompt.subtitle, 0, size * 0.85)
    ctx.fillStyle = '#F4C76A'
    ctx.fillText(prompt.subtitle, 0, size * 0.85)
  }
  ctx.restore()
}

export const addRunPromptInstance = (engine) => {
  engine.addInstance(new Instance({
    name: 'run_prompt',
    action: runPromptAction,
    painter: runPromptPainter
  }))
}

export const drawRushProgress = (engine) => {
  const { ctx } = engine
  const combo = engine.getVariable(constant.perfectCount, 0)
  const remaining = engine.getVariable(constant.sugarRushRemaining, 0)
  const layout = getRushHudLayout(engine.width)
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `900 ${engine.width * 0.042}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
  ctx.lineWidth = engine.width * 0.006
  ctx.strokeStyle = '#FFF7E8'
  ctx.fillStyle = '#D9486E'
  ctx.strokeText('RUSH', layout.centerX, layout.labelY)
  ctx.fillText('RUSH', layout.centerX, layout.labelY)
  if (remaining > 0) {
    const activeLabel = `×2 · ${remaining} LEFT`
    ctx.font = `900 ${engine.width * 0.024}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
    ctx.lineWidth = engine.width * 0.005
    ctx.strokeStyle = '#6B3A35'
    ctx.fillStyle = '#F4C76A'
    ctx.strokeText(activeLabel, layout.centerX, layout.detailY)
    ctx.fillText(activeLabel, layout.centerX, layout.detailY)
  } else {
    const dots = getRushDots(combo)
    dots.forEach((filled, index) => {
      ctx.beginPath()
      ctx.arc(layout.dotXs[index], layout.detailY, engine.width * 0.011, 0, Math.PI * 2)
      ctx.lineWidth = engine.width * 0.005
      ctx.strokeStyle = '#FFF7E8'
      ctx.fillStyle = filled ? '#F4C76A' : 'rgba(255, 247, 232, 0.38)'
      ctx.fill()
      ctx.stroke()
    })
  }
  ctx.restore()
}
