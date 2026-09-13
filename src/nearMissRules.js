export const getNearMissSide = (block, line, landingForgiveness = 0) => {
  const maxDistance = block.width * 0.12
  const leftBoundary = line.x - landingForgiveness
  const rightBoundary = line.collisionX + landingForgiveness
  const leftDistance = leftBoundary - block.x
  const rightDistance = block.x - rightBoundary
  if (leftDistance > 0 && leftDistance <= maxDistance) return 'left'
  if (rightDistance > 0 && rightDistance <= maxDistance) return 'right'
  return null
}
