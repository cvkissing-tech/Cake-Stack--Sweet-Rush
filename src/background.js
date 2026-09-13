import { checkMoveDown, getMoveDownValue } from './utils'
import * as constant from './constant'

export const backgroundImg = (engine) => {
  const bg = engine.getImg('background')
  const extension = engine.getImg('background-extension')
  const sunsetExtension = engine.getImg('background-extension-sunset')
  const nightExtension = engine.getImg('background-extension-night')
  const bgWidth = bg.width
  const bgHeight = bg.height
  const zoomedHeight = (bgHeight * engine.width) / bgWidth
  const startShift = zoomedHeight * 0.01
  let offsetHeight = engine.getVariable(constant.bgImgOffset, engine.height - zoomedHeight)
  engine.getTimeMovement(
    constant.moveDownMovement,
    [[offsetHeight, offsetHeight + (getMoveDownValue(engine, { pixelsPerFrame: s => s / 2 }))]],
    (value) => {
      offsetHeight = value
    },
    {
      name: 'background'
    }
  )
  engine.getTimeMovement(
    constant.bgInitMovement,
    [[offsetHeight, offsetHeight + startShift]],
    (value) => {
      offsetHeight = value
    }
  )
  engine.setVariable(constant.bgImgOffset, offsetHeight)

  // The plate sits at 56% of the source background. Keep the opening movement
  // deliberately small so the landing area stays high enough to show 4-5 tiers.
  engine.setVariable(
    constant.lineInitialOffset,
    engine.height - zoomedHeight + startShift
      + (zoomedHeight * 0.56) + (engine.width * 0.008)
  )

  // Tile a purpose-built upper-floor scene above the ground floor. It uses the
  // same scale and movement as the main image, so the tower never exposes a
  // stretched/faded background or a speed mismatch at the join.
  const initialOffset = engine.height - zoomedHeight + startShift
  const blockHeight = engine.getVariable(constant.blockHeight) || 1
  const floorProgress = Math.max(0, (offsetHeight - initialOffset) / blockHeight)
  const smoothStep = (value) => {
    const progress = Math.max(0, Math.min(1, value))
    return progress * progress * (3 - (2 * progress))
  }
  const sunsetMix = smoothStep((floorProgress - 10) / 2)
  const nightMix = smoothStep((floorProgress - 18) / 2)
  const drawExtension = (image, alpha) => {
    if (alpha <= 0.001) return
    let extensionY = offsetHeight - zoomedHeight
    while (extensionY > 0) extensionY -= zoomedHeight
    const extensionEnd = Math.min(offsetHeight, engine.height)
    engine.ctx.save()
    engine.ctx.globalAlpha = alpha
    for (; extensionY < extensionEnd; extensionY += zoomedHeight) {
      engine.ctx.drawImage(
        image,
        0, extensionY,
        engine.width, zoomedHeight
      )
    }
    engine.ctx.restore()
  }
  drawExtension(extension, 1 - sunsetMix)
  drawExtension(sunsetExtension, sunsetMix * (1 - nightMix))
  drawExtension(nightExtension, nightMix)

  if (offsetHeight <= engine.height) {
    engine.ctx.drawImage(
      bg,
      0, offsetHeight,
      engine.width, zoomedHeight
    )
  }
}

const getLinearGradientColorRgb = (colorArr, colorIndex, proportion) => {
  const currentIndex = colorIndex + 1 >= colorArr.length ? colorArr.length - 1 : colorIndex
  const colorCurrent = colorArr[currentIndex]
  const nextIndex = currentIndex + 1 >= colorArr.length - 1 ? currentIndex : currentIndex + 1
  const colorNext = colorArr[nextIndex]
  const calRgbValue = (index) => {
    const current = colorCurrent[index]
    const next = colorNext[index]
    return Math.round(current + ((next - current) * proportion))
  }
  return `rgb(${calRgbValue(0)}, ${calRgbValue(1)}, ${calRgbValue(2)})`
}

export const backgroundLinearGradient = (engine) => {
  const grad = engine.ctx.createLinearGradient(0, 0, 0, engine.height)
  const colorArr = [
    [255, 247, 232],
    [255, 213, 222],
    [196, 237, 224],
    [184, 174, 220],
    [116, 83, 132],
    [82, 52, 88],
    [52, 30, 48]
  ]
  const offsetHeight = engine.getVariable(constant.bgLinearGradientOffset, 0)
  if (checkMoveDown(engine)) {
    engine.setVariable(
      constant.bgLinearGradientOffset
      , offsetHeight + (getMoveDownValue(engine) * 1.5)
    )
  }
  const colorIndex = parseInt(offsetHeight / engine.height, 10)
  const calOffsetHeight = offsetHeight % engine.height
  const proportion = calOffsetHeight / engine.height
  const colorBase = getLinearGradientColorRgb(colorArr, colorIndex, proportion)
  const colorTop = getLinearGradientColorRgb(colorArr, colorIndex + 1, proportion)
  grad.addColorStop(0, colorTop)
  grad.addColorStop(1, colorBase)
  engine.ctx.fillStyle = grad
  engine.ctx.beginPath()
  engine.ctx.rect(0, 0, engine.width, engine.height)
  engine.ctx.fill()

  // lightning
  const lightning = () => {
    engine.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    engine.ctx.fillRect(0, 0, engine.width, engine.height)
  }
  engine.getTimeMovement(
    constant.lightningMovement, [], () => {},
    {
      before: lightning,
      after: lightning
    }
  )
}

export const background = (engine) => {
  backgroundLinearGradient(engine)
  backgroundImg(engine)
}
