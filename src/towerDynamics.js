import { PERFECT, GREAT, SAFE } from './gameplayRules'
import * as constant from './constant'

const referenceWidth = 390
const stiffness = 13.66
const damping = 1.71
const maxFrameDelta = 0.05
const physicsStep = 1 / 120

const offsetAnchors = [
  { floor: 4, pixels: 0 },
  { floor: 5, pixels: 4 },
  { floor: 9, pixels: 10 },
  { floor: 14, pixels: 16 },
  { floor: 19, pixels: 22 },
  { floor: 25, pixels: 28 }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const interpolate = (from, to, progress) => from + ((to - from) * progress)

export const createTowerState = () => ({
  angle: 0,
  angularVelocity: 0,
  floorCount: 0,
  lastUpdateTime: null
})

export const getMaxTowerTopOffset = (floorCount, width) => {
  const floor = Math.max(0, Number(floorCount) || 0)
  const scale = Math.max(0, Number(width) || referenceWidth) / referenceWidth
  if (floor <= offsetAnchors[0].floor) return 0
  for (let index = 1; index < offsetAnchors.length; index += 1) {
    const previous = offsetAnchors[index - 1]
    const current = offsetAnchors[index]
    if (floor <= current.floor) {
      const progress = (floor - previous.floor) / (current.floor - previous.floor)
      return interpolate(previous.pixels, current.pixels, progress) * scale
    }
  }
  return offsetAnchors[offsetAnchors.length - 1].pixels * scale
}

const getLeverArm = (level, blockHeight) => (
  Math.max(0, (Number(level) || 0) - 1) * blockHeight
)

const getMaxAngle = (state, width, blockHeight) => {
  const leverArm = getLeverArm(state.floorCount, blockHeight)
  const maxOffset = getMaxTowerTopOffset(state.floorCount, width)
  if (!leverArm || !maxOffset) return 0
  return Math.asin(clamp(maxOffset / leverArm, 0, 1))
}

export const getTowerLayerOffset = (state, level, blockHeight) => (
  getLeverArm(level, blockHeight) * Math.sin(state.angle)
)

export const stepTowerState = (sourceState, deltaSeconds, width, blockHeight) => {
  const state = { ...sourceState }
  const delta = clamp(Number(deltaSeconds) || 0, 0, maxFrameDelta)
  const maxAngle = getMaxAngle(state, width, blockHeight)
  if (!maxAngle) {
    state.angle = 0
    state.angularVelocity = 0
    return state
  }
  const steps = Math.max(1, Math.ceil(delta / physicsStep))
  const step = delta / steps
  for (let index = 0; index < steps; index += 1) {
    const acceleration = (-stiffness * state.angle) - (damping * state.angularVelocity)
    state.angularVelocity += acceleration * step
    state.angle += state.angularVelocity * step
    if (Math.abs(state.angle) > maxAngle) {
      const direction = Math.sign(state.angle)
      state.angle = direction * maxAngle
      if (Math.sign(state.angularVelocity) === direction) {
        state.angularVelocity *= -0.18
      }
    }
  }
  if (Math.abs(state.angle) < 0.000001 && Math.abs(state.angularVelocity) < 0.00001) {
    state.angle = 0
    state.angularVelocity = 0
  }
  return state
}

export const applyTowerLanding = (
  sourceState,
  rating,
  errorRatio,
  width,
  blockHeight
) => {
  const state = { ...sourceState }
  const leverArm = getLeverArm(state.floorCount, blockHeight)
  const maxOffset = getMaxTowerTopOffset(state.floorCount, width)
  if (!leverArm || !maxOffset) {
    state.angle = 0
    state.angularVelocity = 0
    return state
  }
  if (rating === PERFECT) {
    state.angularVelocity *= 0.55
    return state
  }
  const error = Number(errorRatio) || 0
  const direction = Math.sign(error)
  if (!direction) return state
  const errorMagnitude = Math.abs(error)
  const scale = width / referenceWidth
  let topSpeed = 0
  if (rating === GREAT) {
    topSpeed = interpolate(34, 50, clamp((errorMagnitude - 0.05) / 0.1, 0, 1))
  } else if (rating === SAFE) {
    topSpeed = interpolate(58, 86, clamp((errorMagnitude - 0.15) / 0.3, 0, 1))
  }
  state.angularVelocity += direction * ((topSpeed * scale) / leverArm)
  const maxAngularVelocity = (90 * scale) / leverArm
  state.angularVelocity = clamp(
    state.angularVelocity,
    maxAngularVelocity * -1,
    maxAngularVelocity
  )
  return state
}

export const initializeTowerDynamics = (engine) => {
  engine.setVariable(constant.towerDynamicsState, createTowerState())
}

export const getTowerState = engine => (
  engine.getVariable(constant.towerDynamicsState, createTowerState())
)

export const getTowerRiskRatio = (engine) => {
  const state = getTowerState(engine)
  const blockHeight = engine.getVariable(constant.blockHeight)
  const maxOffset = getMaxTowerTopOffset(state.floorCount, engine.width)
  if (!maxOffset || !state.floorCount) return 0
  const currentOffset = Math.abs(getTowerLayerOffset(
    state,
    state.floorCount,
    blockHeight
  ))
  return clamp(currentOffset / maxOffset, 0, 1)
}

export const updateTowerDynamics = (engine, time) => {
  const current = getTowerState(engine)
  if (typeof current.lastUpdateTime !== 'number') {
    const initialized = { ...current, lastUpdateTime: time }
    engine.setVariable(constant.towerDynamicsState, initialized)
    return initialized
  }
  const next = stepTowerState(
    current,
    (time - current.lastUpdateTime) / 1000,
    engine.width,
    engine.getVariable(constant.blockHeight)
  )
  next.lastUpdateTime = time
  engine.setVariable(constant.towerDynamicsState, next)
  return next
}

export const registerTowerLanding = (engine, block, line, level) => {
  const blockHeight = engine.getVariable(constant.blockHeight)
  const state = { ...getTowerState(engine), floorCount: level }
  const currentOffset = getTowerLayerOffset(state, level, blockHeight)
  block.towerLevel = level
  block.restX = block.x - currentOffset
  line.towerLevel = level
  line.restX = block.restX - block.calWidth
  line.x = line.restX + currentOffset
  line.collisionX = line.x + block.width
  engine.setVariable(constant.towerDynamicsState, state)
  return state
}

export const applyTowerLandingFeedback = (engine, rating, errorRatio) => {
  const next = applyTowerLanding(
    getTowerState(engine),
    rating,
    errorRatio,
    engine.width,
    engine.getVariable(constant.blockHeight)
  )
  engine.setVariable(constant.towerDynamicsState, next)
  return next
}

export const getTowerBlockX = (engine, block) => {
  if (typeof block.restX !== 'number' || !block.towerLevel) return block.x
  return block.restX + getTowerLayerOffset(
    getTowerState(engine),
    block.towerLevel,
    engine.getVariable(constant.blockHeight)
  )
}

export const getTowerLineX = (engine, line) => {
  if (typeof line.restX !== 'number' || !line.towerLevel) return line.x
  return line.restX + getTowerLayerOffset(
    getTowerState(engine),
    line.towerLevel,
    engine.getVariable(constant.blockHeight)
  )
}
