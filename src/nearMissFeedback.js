import { Instance } from 'cooljs'
import * as constant from './constant'

const duration = 660

const action = (instance, engine, time) => {
  if (!instance.started) {
    instance.started = true
    instance.startTime = time
  }
  instance.elapsed = time - instance.startTime
  if (instance.elapsed >= duration) engine.removeInstance(instance.name, constant.feedbackLayer)
}

const painter = (instance, engine) => {
  const { ctx } = engine
  const progress = Math.min((instance.elapsed || 0) / duration, 1)
  const fade = progress < 0.62 ? 1 : Math.max(0, (1 - progress) / 0.38)
  const y = engine.height * 0.38
  const size = engine.width * 0.061
  ctx.save()
  ctx.globalAlpha = fade
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
  ctx.lineWidth = engine.width * 0.013
  ctx.strokeStyle = '#FFF7E8'
  ctx.shadowColor = 'rgba(107, 58, 53, 0.3)'
  ctx.shadowBlur = engine.width * 0.014
  ctx.strokeText('SO CLOSE!', engine.width / 2, y)
  ctx.fillStyle = '#F3A85C'
  ctx.fillText('SO CLOSE!', engine.width / 2, y)
  for (let index = 0; index < 6; index += 1) {
    const direction = instance.side === 'left' ? -1 : 1
    const particleX = instance.landX + (direction * engine.width * (0.015 + (progress * (0.03 + (index * 0.006)))))
    const particleY = instance.landY + (Math.sin(index * 1.8) * engine.width * 0.025) + (progress * engine.width * 0.04)
    ctx.beginPath()
    ctx.fillStyle = index % 2 ? '#FF6F91' : '#F4C76A'
    ctx.arc(particleX, particleY, engine.width * 0.005, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const playNearMissTone = (engine) => {
  if (!engine.soundOn || typeof window === 'undefined') return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  try {
    if (!playNearMissTone.context) playNearMissTone.context = new AudioContext()
    const context = playNearMissTone.context
    if (context.state === 'suspended') context.resume().catch(() => {})
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(520, now)
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.13)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.028, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.16)
  } catch (error) {
    // Optional feedback must not affect unsupported browsers.
  }
}

export const addNearMissFeedback = (engine, block, side) => {
  if (!side || block.nearMissShown) return
  block.nearMissShown = true
  const feedback = new Instance({
    name: `near_miss_${block.name}`,
    action,
    painter
  })
  feedback.side = side
  feedback.landX = block.x + (block.width / 2)
  feedback.landY = block.y + block.height
  engine.addInstance(feedback, constant.feedbackLayer)
  playNearMissTone(engine)
}
