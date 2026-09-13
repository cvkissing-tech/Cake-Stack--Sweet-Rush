export const PERFECT = 'PERFECT'
export const GREAT = 'GREAT'
export const SAFE = 'SAFE'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const getLandingRating = (blockX, blockWidth, targetX, targetWidth) => {
  // line.x/collisionX describe the legal range of the cake's left edge. The
  // midpoint is therefore the perfectly aligned left-edge position.
  const targetCenter = targetX + (targetWidth / 2)
  const errorRatio = Math.abs(blockX - targetCenter) / blockWidth
  if (errorRatio <= 0.05) return PERFECT
  if (errorRatio <= 0.15) return GREAT
  return SAFE
}

export const getDifficultyProfile = (successCount, hardMode = false) => {
  const floors = Math.max(0, Number(successCount) || 0)
  let angle = 24
  let swingSpeed = 0
  let platformSpeed = 0

  if (floors === 0) {
    // The first cake is a static tutorial drop.
  } else if (floors <= 2) {
    angle = 28
    swingSpeed = 0.78
  } else if (floors <= 4) {
    angle = 28 + ((floors - 2) * 2)
    swingSpeed = 0.78
  } else if (floors <= 7) {
    angle = 32
    swingSpeed = 0.78 + (((floors - 4) / 3) * 0.14)
  } else if (floors <= 10) {
    angle = 32 + (((floors - 7) / 3) * 16)
    swingSpeed = 0.92
  } else if (floors <= 13) {
    angle = 48
    swingSpeed = 0.92
    platformSpeed = 0.0001 + ((floors - 10) * 0.0002)
  } else if (floors <= 17) {
    angle = 48
    swingSpeed = 0.92 + (((floors - 13) / 4) * 0.08)
    platformSpeed = 0.0007
  } else if (floors <= 24) {
    angle = 48 + (((floors - 17) / 7) * 14)
    swingSpeed = 1
    platformSpeed = 0.0007
  } else {
    angle = 62
    swingSpeed = 1
    platformSpeed = 0.0007 + (clamp((floors - 24) / 20, 0, 1) * 0.0011)
  }

  if (hardMode) angle = Math.min(78, angle + 8)
  return { angle, swingSpeed, platformSpeed }
}

export const shouldTriggerSugarRush = (combo, lastTriggeredCombo) => (
  combo >= 3 && combo % 3 === 0 && combo !== lastTriggeredCombo
)

export const getNextPerfectCombo = (rating, currentCombo) => (
  rating === PERFECT ? currentCombo + 1 : 0
)

export const getScoreDelta = (
  rating,
  combo,
  multiplier = 1,
  successScore = 25,
  perfectScore = 25
) => {
  let ratingBonus = 0
  if (rating === PERFECT) ratingBonus = perfectScore * combo
  if (rating === GREAT) ratingBonus = perfectScore * 0.6
  return Math.round((successScore + ratingBonus) * multiplier)
}
