export const rushTarget = 3

export const getRushCharge = combo => Math.max(0, Number(combo || 0) % rushTarget)

export const getRushDots = combo => Array.from(
  { length: rushTarget },
  (_, index) => index < getRushCharge(combo)
)

export const getRushHudLayout = width => {
  const centerX = width * 0.5
  const labelY = width * 0.075
  const detailY = width * 0.135
  const dotGap = width * 0.038
  return {
    centerX,
    labelY,
    detailY,
    dotXs: [centerX - dotGap, centerX, centerX + dotGap]
  }
}
