import { Instance } from 'cooljs'
import * as constant from './constant'

const getActionConfig = (engine, type) => {
  const {
    width, height, utils
  } = engine
  const { random } = utils
  const size = engine.getVariable(constant.cloudSize)
  const actionTypes = {
    bottomToTop: {
      x: width * random(0.3, 0.7),
      y: height,
      vx: 0,
      vy: engine.pixelsPerFrame(height) * 0.7 * -1
    },
    leftToRight: {
      x: size * -1,
      y: height * random(0.3, 0.6),
      vx: engine.pixelsPerFrame(width) * 0.4,
      vy: engine.pixelsPerFrame(height) * 0.1 * -1
    },
    rightToLeft: {
      x: width,
      y: height * random(0.2, 0.5),
      vx: engine.pixelsPerFrame(width) * 0.4 * -1,
      vy: engine.pixelsPerFrame(height) * 0.1
    },
    rightTopToLeft: {
      x: width,
      y: 0,
      vx: engine.pixelsPerFrame(width) * 0.6 * -1,
      vy: engine.pixelsPerFrame(height) * 0.5
    }
  }
  return actionTypes[type]
}


export const flightAction = (instance, engine, time) => {
  const { visible, ready, type } = instance
  if (!visible) return
  const size = engine.getVariable(constant.cloudSize)
  if (!ready) {
    const action = getActionConfig(engine, type)
    instance.ready = true
    instance.width = size
    instance.height = size
    instance.x = action.x
    instance.y = action.y
    instance.vx = action.vx
    instance.vy = action.vy
    instance.phase = engine.utils.random(0, Math.PI * 2)
  }
  const speed = Math.sqrt((instance.vx ** 2) + (instance.vy ** 2)) || 1
  const bob = engine.pixelsPerFrame(size * 0.035)
    * Math.sin((time / 130) + instance.phase)
  instance.x += instance.vx + ((instance.vy / speed) * bob * -1)
  instance.y += instance.vy + ((instance.vx / speed) * bob)
  instance.tilt = Math.sin((time / 170) + instance.phase) * 0.08
  instance.flutter = 1 + (Math.sin((time / 85) + instance.phase) * 0.055)
  if (instance.y + size < 0
    || instance.y > engine.height
    || instance.x + size < 0
    || instance.x > engine.width) {
    instance.visible = false
  }
}

export const flightPainter = (instance, engine) => {
  const { ctx } = engine
  const flight = engine.getImg(instance.imgName)
  let angle = Math.atan2(instance.vy, instance.vx || 0.0001)
  let direction = 1
  if (angle > Math.PI / 2 || angle < Math.PI / -2) {
    angle += angle > 0 ? Math.PI * -1 : Math.PI
    direction = -1
  }
  ctx.save()
  ctx.translate(instance.x + (instance.width / 2), instance.y + (instance.height / 2))
  ctx.rotate(angle + (instance.tilt || 0))
  ctx.scale(direction, instance.flutter || 1)
  ctx.drawImage(flight, instance.width / -2, instance.height / -2, instance.width, instance.height)
  ctx.restore()
}

export const addFlight = (engine, number, type) => {
  const flightCount = engine.getVariable(constant.flightCount)
  if (flightCount === number) return
  const flight = new Instance({
    name: `flight_${number}`,
    action: flightAction,
    painter: flightPainter
  })
  flight.imgName = `f${number}`
  flight.type = type
  engine.addInstance(flight, constant.flightLayer)
  engine.setVariable(constant.flightCount, number)
}
