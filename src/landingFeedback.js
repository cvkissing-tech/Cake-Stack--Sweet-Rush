import { Instance } from 'cooljs'
import { PERFECT, GREAT, SAFE } from './gameplayRules'

const feedbackDuration = 820

const styles = {
  [PERFECT]: {
    label: 'PERFECT!',
    top: '#FFD76A',
    bottom: '#FF5F8B',
    outline: '#FFF9E9',
    particles: 16,
    strength: 1,
    vibration: 36
  },
  [GREAT]: {
    label: 'GREAT!',
    top: '#B9F4D9',
    bottom: '#45BFA0',
    outline: '#F4FFF9',
    particles: 10,
    strength: 0.64,
    vibration: 18
  },
  [SAFE]: {
    label: 'GOOD!',
    top: '#FFF0B8',
    bottom: '#F3A85C',
    outline: '#FFF7E8',
    particles: 5,
    strength: 0.32,
    vibration: 0
  }
}

const feedbackAction = (instance, engine, time) => {
  if (!instance.ready) {
    instance.ready = true
    instance.startTime = time
  }
  instance.elapsed = time - instance.startTime
  if (instance.elapsed >= feedbackDuration) engine.removeInstance(instance.name)
}

const drawParticle = (ctx, x, y, size, angle, alpha, color) => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, size * -1.45)
  ctx.lineTo(size * 0.42, size * -0.42)
  ctx.lineTo(size * 1.45, 0)
  ctx.lineTo(size * 0.42, size * 0.42)
  ctx.lineTo(0, size * 1.45)
  ctx.lineTo(size * -0.42, size * 0.42)
  ctx.lineTo(size * -1.45, 0)
  ctx.lineTo(size * -0.42, size * -0.42)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const feedbackPainter = (instance, engine) => {
  const { ctx } = engine
  const style = styles[instance.rating]
  const progress = Math.min((instance.elapsed || 0) / feedbackDuration, 1)
  const fade = progress < 0.68 ? 1 : Math.max(0, (1 - progress) / 0.32)
  const burstProgress = Math.min(progress / 0.7, 1)

  if (progress < 0.14) {
    const flashStrength = style.strength * (instance.rushTriggered ? 0.24 : 0.12)
    ctx.save()
    ctx.fillStyle = `rgba(255, 230, 142, ${(0.14 - progress) * flashStrength})`
    ctx.fillRect(0, 0, engine.width, engine.height)
    ctx.restore()
  }

  for (let index = 0; index < style.particles; index += 1) {
    const angle = instance.seed + ((Math.PI * 2 * index) / style.particles)
    const spread = engine.width * (0.03 + (burstProgress * (0.075 + ((index % 3) * 0.012))))
    drawParticle(
      ctx,
      instance.landX + (Math.cos(angle) * spread),
      instance.landY + (Math.sin(angle) * spread * 0.58),
      engine.width * (0.006 + ((index % 2) * 0.002)),
      angle + burstProgress,
      (1 - burstProgress) * fade,
      instance.sugarRushCake || instance.rushTriggered ? '#FFD76A' : style.top
    )
  }

  const popProgress = Math.min(progress / 0.3, 1)
  const popScale = popProgress < 0.65
    ? 0.62 + ((popProgress / 0.65) * 0.55)
    : 1.17 - (((popProgress - 0.65) / 0.35) * 0.17)
  const labelSize = engine.width * (instance.rating === PERFECT ? 0.088 : 0.078)

  ctx.save()
  ctx.globalAlpha = fade
  ctx.translate(engine.width / 2, instance.textY)
  ctx.scale(popScale, popScale)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `900 ${labelSize}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
  ctx.lineWidth = engine.width * 0.016
  ctx.strokeStyle = style.outline
  ctx.shadowColor = 'rgba(91, 53, 54, 0.38)'
  ctx.shadowBlur = engine.width * 0.018
  ctx.strokeText(style.label, 0, 0)
  const gradient = ctx.createLinearGradient(0, labelSize * -0.6, 0, labelSize * 0.6)
  gradient.addColorStop(0, style.top)
  gradient.addColorStop(1, style.bottom)
  ctx.fillStyle = gradient
  ctx.fillText(style.label, 0, 0)

  if (instance.combo >= 2) {
    const comboSize = engine.width * 0.054
    ctx.font = `900 ${comboSize}px "Arial Rounded MT Bold", "Trebuchet MS", Arial`
    ctx.lineWidth = engine.width * 0.011
    ctx.strokeText(`COMBO ×${instance.combo}`, 0, labelSize * 0.9)
    ctx.fillStyle = '#FFD76A'
    ctx.fillText(`COMBO ×${instance.combo}`, 0, labelSize * 0.9)
  }

  ctx.restore()
}

const playTone = (engine, rating, combo, sugarRushCake) => {
  if (!engine.soundOn || typeof window === 'undefined') return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  try {
    if (!playTone.context) playTone.context = new AudioContext()
    const context = playTone.context
    if (context.state === 'suspended') context.resume().catch(() => {})
    const now = context.currentTime
    const perfectPitch = 1 + ((Math.min(combo, 6) - 1) * 0.035)
    const baseFrequencies = rating === PERFECT ? [880, 1175] : rating === GREAT ? [660] : [480, 560]
    const frequencies = baseFrequencies.map(frequency => (
      rating === PERFECT ? frequency * perfectPitch : frequency
    ))
    if (sugarRushCake) frequencies.push(1320)
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = now + (index * 0.055)
      oscillator.type = rating === SAFE ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(rating === SAFE ? 0.045 : 0.055, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.13)
    })
  } catch (error) {
    // Audio feedback is optional; the game remains playable when unavailable.
  }
}

const playRegisteredAudio = (engine, name) => {
  if (!engine.soundOn) return
  const audio = engine.getAudio(name)
  if (!audio) return
  try {
    audio.currentTime = 0
    const promise = audio.play()
    if (promise && promise.catch) promise.catch(() => {})
  } catch (error) {
    // Registered audio is optional on restricted mobile browsers.
  }
}

export const playSugarRushAudio = engine => playRegisteredAudio(engine, 'sugar-rush')

const vibrate = (engine, duration) => {
  if (!duration || !engine.isTouchDevice || typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(duration)
  } catch (error) {
    // Vibration support varies by browser and must never block gameplay.
  }
}

export const startLandingImpact = (block, rating, time) => {
  const strength = rating === PERFECT ? 0.105 : rating === GREAT ? 0.067 : 0.035
  block.landingImpact = { start: time, duration: 360, strength }
}

export const updateLandingImpact = (block, time) => {
  const impact = block.landingImpact
  if (!impact) return
  const progress = Math.min(1, (time - impact.start) / impact.duration)
  const wave = Math.sin(progress * Math.PI * 3) * (1 - progress) * impact.strength
  block.impactScaleY = 1 - wave
  block.impactScaleX = 1 + (wave * 0.35)
  if (progress >= 1) {
    block.impactScaleX = 1
    block.impactScaleY = 1
    block.landingImpact = null
  }
}

export const addLandingFeedback = (engine, block, option) => {
  const { rating, combo, rushTriggered, sugarRushCake } = option
  const style = styles[rating]
  const feedback = new Instance({
    name: `landing_feedback_${engine.getVariable('SUCCESS_COUNT')}_${Date.now()}`,
    action: feedbackAction,
    painter: feedbackPainter
  })
  feedback.rating = rating
  feedback.combo = combo
  feedback.rushTriggered = rushTriggered
  feedback.sugarRushCake = sugarRushCake
  feedback.landX = block.x + (block.width / 2)
  feedback.landY = block.y + (block.height / 2)
  feedback.textY = Math.max(engine.width * 0.3, engine.height * 0.3)
  feedback.seed = engine.utils.random(0, Math.PI * 2)
  engine.addInstance(feedback)

  if (rating === PERFECT) playRegisteredAudio(engine, 'drop-perfect')
  else if (rating === GREAT) playRegisteredAudio(engine, 'drop')
  else playRegisteredAudio(engine, 'drop-safe')
  playTone(engine, rating, combo, sugarRushCake)
  vibrate(engine, style.vibration)
}
