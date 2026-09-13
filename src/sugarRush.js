import * as constant from './constant'
import { shouldTriggerSugarRush } from './gameplayRules'

const activationDuration = 220
const restoreDuration = 700

const getTransitionValue = (transition, time) => {
  if (!transition) return 0
  const progress = Math.max(0, Math.min(1, (time - transition.start) / transition.duration))
  const eased = progress * progress * (3 - (2 * progress))
  return transition.from + ((transition.to - transition.from) * eased)
}

export const initializeSugarRush = (engine) => {
  engine.setVariable(constant.sugarRushRemaining, 0)
  engine.setVariable(constant.sugarRushLastTrigger, 0)
  engine.setVariable(constant.sugarRushTransition, null)
}

export const getSugarRushBlend = (engine, time) => {
  const transition = engine.getVariable(constant.sugarRushTransition)
  if (!transition) return 0
  const value = getTransitionValue(transition, time)
  if (time >= transition.start + transition.duration && transition.to === 0) {
    engine.setVariable(constant.sugarRushTransition, null)
  }
  return value
}

export const triggerSugarRush = (engine, combo, time) => {
  const lastTrigger = engine.getVariable(constant.sugarRushLastTrigger, 0)
  if (!shouldTriggerSugarRush(combo, lastTrigger)) return false
  const currentBlend = getSugarRushBlend(engine, time)
  engine.setVariable(constant.sugarRushRemaining, 2)
  engine.setVariable(constant.sugarRushLastTrigger, combo)
  engine.setVariable(constant.sugarRushTransition, {
    from: currentBlend,
    to: 1,
    start: time,
    duration: activationDuration
  })
  return true
}

export const markSugarRushCake = (engine, block) => {
  block.sugarRush = engine.getVariable(constant.sugarRushRemaining, 0) > 0
}

export const resolveSugarRushCake = (engine, block, time) => {
  if (!block.sugarRush || block.sugarRushResolved) return
  block.sugarRushResolved = true
  const remaining = Math.max(0, engine.getVariable(constant.sugarRushRemaining, 0) - 1)
  engine.setVariable(constant.sugarRushRemaining, remaining)
  if (remaining === 0) {
    const currentBlend = getSugarRushBlend(engine, time)
    engine.setVariable(constant.sugarRushTransition, {
      from: currentBlend,
      to: 0,
      start: time,
      duration: restoreDuration
    })
  }
}

export const getSugarRushMultiplier = block => (block.sugarRush ? 2 : 1)

export const getSugarRushSpeedFactor = (engine, time) => (
  1 - (getSugarRushBlend(engine, time) * 0.1)
)
