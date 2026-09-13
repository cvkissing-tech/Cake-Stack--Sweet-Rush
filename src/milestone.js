import * as constant from './constant'

export const milestones = [
  { floor: 5, label: 'SWEET START' },
  { floor: 10, label: 'PASTRY PRO' },
  { floor: 15, label: 'SKY HIGH' },
  { floor: 20, label: 'MASTER BAKER' },
  { floor: 30, label: 'LEGENDARY STACK' }
]

const smoothStep = (value) => {
  const progress = Math.max(0, Math.min(1, value))
  return progress * progress * (3 - (2 * progress))
}

export const getMilestone = floor => milestones.find(item => item.floor === floor) || null

export const getUpcomingMilestone = floor => milestones.find(item => item.floor > floor) || null

export const initializeMilestones = (engine) => {
  engine.setVariable(constant.milestonesTriggered, [])
  engine.setVariable(constant.targetsPrompted, [])
  engine.setVariable(constant.milestoneReliefPending, 0)
  engine.setVariable(constant.milestoneReliefRestore, null)
}

export const claimMilestone = (engine, floor) => {
  const milestone = getMilestone(floor)
  if (!milestone) return null
  const triggered = engine.getVariable(constant.milestonesTriggered, [])
  if (triggered.indexOf(floor) > -1) return null
  engine.setVariable(constant.milestonesTriggered, triggered.concat([floor]))
  engine.setVariable(
    constant.milestoneReliefPending,
    engine.getVariable(constant.milestoneReliefPending, 0) + 1
  )
  return milestone
}

export const claimTargetPrompt = (engine, targetFloor) => {
  const prompted = engine.getVariable(constant.targetsPrompted, [])
  if (prompted.indexOf(targetFloor) > -1) return false
  engine.setVariable(constant.targetsPrompted, prompted.concat([targetFloor]))
  return true
}

export const markMilestoneReliefCake = (engine, block) => {
  const pending = engine.getVariable(constant.milestoneReliefPending, 0)
  if (pending <= 0 || block.sugarRush) return
  block.milestoneRelief = true
  engine.setVariable(constant.milestoneReliefPending, pending - 1)
}

export const getMilestoneReliefFactor = (engine, block, time) => {
  if (block && block.milestoneRelief) {
    if (typeof block.milestoneReliefStart !== 'number') block.milestoneReliefStart = time
    return 1 - (smoothStep((time - block.milestoneReliefStart) / 180) * 0.06)
  }
  const restore = engine.getVariable(constant.milestoneReliefRestore)
  if (!restore) return 1
  const progress = (time - restore.start) / restore.duration
  if (progress >= 1) {
    engine.setVariable(constant.milestoneReliefRestore, null)
    return 1
  }
  return 0.94 + (smoothStep(progress) * 0.06)
}

export const resolveMilestoneReliefCake = (engine, block, time) => {
  if (!block.milestoneRelief || block.milestoneReliefResolved) return
  block.milestoneReliefResolved = true
  engine.setVariable(constant.milestoneReliefRestore, {
    start: time,
    duration: 300
  })
}
