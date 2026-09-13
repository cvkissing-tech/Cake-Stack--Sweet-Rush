import { PERFECT } from './gameplayRules'
import * as constant from './constant'

const storageKey = 'sweet-stack-dessert-book-v1'

export const cakeStyles = [
  { id: 'cake-strawberry', name: 'Strawberry Cream', rarity: 'base', crownHint: 'FLOOR 20 PERFECT' },
  { id: 'cake-chocolate', name: 'Chocolate Mousse', rarity: 'base', crownHint: 'RISKY PERFECT' },
  { id: 'cake-lemon', name: 'Lemon Cake', rarity: 'base', crownHint: '2 PERFECTS · 1 RUN' },
  { id: 'cake-blueberry', name: 'Blueberry Cream', rarity: 'base', crownHint: 'RUSH PERFECT' },
  { id: 'cake-macaron', name: 'Macaron Icebox', rarity: 'base', crownHint: 'REACH FLOOR 25' },
  { id: 'cake-star-sprinkle', name: 'Star Sprinkle', rarity: 'rare', crownHint: 'COMBO PERFECT' },
  { id: 'cake-golden-caramel', name: 'Golden Caramel', rarity: 'rare', crownHint: 'RUSH PERFECT' },
  { id: 'cake-berry-jewel', name: 'Berry Jewel', rarity: 'rare', crownHint: 'FLOOR 10 PERFECT' },
  { id: 'cake-royal-macaron', name: 'Royal Macaron', rarity: 'rare', crownHint: 'ROYAL PERFECT' }
]

const baseStyleIds = cakeStyles
  .filter(style => style.rarity === 'base')
  .map(style => style.id)

const getStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch (error) {
    return null
  }
}

const loadCollection = () => {
  const storage = getStorage()
  if (!storage) return {}
  try {
    return JSON.parse(storage.getItem(storageKey) || '{}')
  } catch (error) {
    return {}
  }
}

const saveCollection = (collection) => {
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(storageKey, JSON.stringify(collection))
    } catch (error) {
      // Collection progress is optional; storage failure must never stop play.
    }
  }
  if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new window.CustomEvent('sweetstack:collection'))
  }
}

const ensureDefaultCake = () => {
  const collection = loadCollection()
  if (!collection['cake-strawberry']) {
    collection['cake-strawberry'] = {
      placements: 0,
      perfects: 0,
      crowned: false
    }
    saveCollection(collection)
  }
  return collection
}

export const getCakeCollectionSnapshot = () => {
  const collection = ensureDefaultCake()
  return cakeStyles.map(style => ({
    ...style,
    discovered: Boolean(collection[style.id]),
    placements: collection[style.id] ? collection[style.id].placements || 0 : 0,
    perfects: collection[style.id] ? collection[style.id].perfects || 0 : 0,
    mastered: collection[style.id] ? collection[style.id].perfects >= 3 : false,
    crowned: collection[style.id] ? Boolean(collection[style.id].crowned) : false
  }))
}

export const getCakeCollectionStage = (snapshot = getCakeCollectionSnapshot()) => {
  if (snapshot.some(style => !style.discovered)) return 'discover'
  if (snapshot.some(style => !style.mastered)) return 'master'
  if (snapshot.some(style => !style.crowned)) return 'crown'
  return 'complete'
}

const chooseSessionTarget = (snapshot) => {
  const baseStyles = snapshot.filter(style => style.rarity === 'base')
  const undiscovered = baseStyles.find(style => !style.discovered)
  if (undiscovered) return { newStyle: undiscovered.id, featuredStyle: null }
  const unmastered = baseStyles.find(style => !style.mastered)
  if (unmastered) return { newStyle: null, featuredStyle: unmastered.id }
  const uncrowned = baseStyles.find(style => !style.crowned)
  return { newStyle: null, featuredStyle: uncrowned ? uncrowned.id : null }
}

export const initializeCakeCollection = (engine) => {
  const target = chooseSessionTarget(getCakeCollectionSnapshot())
  engine.setVariable(constant.cakeRareQueue, [])
  engine.setVariable(constant.cakeSessionNewStyle, target.newStyle)
  engine.setVariable(constant.cakeSessionNewIntroduced, false)
  engine.setVariable(constant.cakeSessionFeaturedStyle, target.featuredStyle)
  engine.setVariable(constant.cakeStylesSinceFeature, 0)
  engine.setVariable(constant.cakeKnownBag, [])
  engine.setVariable(constant.cakeLastStyle, null)
  engine.setVariable(constant.cakeRunPerfects, {})
}

const enqueueRareCake = (engine, styleId) => {
  const queue = engine.getVariable(constant.cakeRareQueue, [])
  if (queue.indexOf(styleId) > -1) return
  engine.setVariable(constant.cakeRareQueue, queue.concat([styleId]))
}

const rememberStyle = (engine, styleId) => {
  engine.setVariable(constant.cakeLastStyle, styleId)
  return styleId
}

const getKnownBaseStyles = (excludedStyle) => {
  const known = getCakeCollectionSnapshot()
    .filter(style => style.rarity === 'base' && style.discovered)
    .map(style => style.id)
    .filter(styleId => styleId !== excludedStyle)
  return known.length ? known : ['cake-strawberry']
}

const chooseKnownStyle = (engine, excludedStyle) => {
  const known = getKnownBaseStyles(excludedStyle)
  const lastStyle = engine.getVariable(constant.cakeLastStyle)
  let bag = engine.getVariable(constant.cakeKnownBag, [])
    .filter(styleId => known.indexOf(styleId) > -1)

  if (!bag.length) {
    bag = known.reduce((tickets, styleId) => {
      const weight = styleId === 'cake-strawberry' ? 3 : 1
      for (let count = 0; count < weight; count += 1) tickets.push(styleId)
      return tickets
    }, [])
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const current = bag[index]
      bag[index] = bag[swapIndex]
      bag[swapIndex] = current
    }
  }

  if (bag.length > 1 && bag[0] === lastStyle) {
    const alternativeIndex = bag.findIndex(styleId => styleId !== lastStyle)
    if (alternativeIndex > 0) {
      const current = bag[0]
      bag[0] = bag[alternativeIndex]
      bag[alternativeIndex] = current
    }
  }

  const styleId = bag.shift()
  engine.setVariable(constant.cakeKnownBag, bag)
  return styleId
}

const assignBaseStyle = (engine, block) => {
  const nextFloor = engine.getVariable(constant.successCount, 0) + 1
  const newStyle = engine.getVariable(constant.cakeSessionNewStyle)
  const introduced = engine.getVariable(constant.cakeSessionNewIntroduced, false)
  const featuredStyle = newStyle || engine.getVariable(constant.cakeSessionFeaturedStyle)
  const sinceFeature = engine.getVariable(constant.cakeStylesSinceFeature, 0)

  if (newStyle && nextFloor >= 5 && !introduced) {
    engine.setVariable(constant.cakeSessionNewIntroduced, true)
    engine.setVariable(constant.cakeStylesSinceFeature, 0)
    block.cakeStyleId = rememberStyle(engine, newStyle)
    return block.cakeStyleId
  }

  if (featuredStyle && (!newStyle || introduced) && sinceFeature >= 4) {
    engine.setVariable(constant.cakeStylesSinceFeature, 0)
    block.cakeStyleId = rememberStyle(engine, featuredStyle)
    return block.cakeStyleId
  }

  engine.setVariable(constant.cakeStylesSinceFeature, sinceFeature + 1)
  block.cakeStyleId = rememberStyle(engine, chooseKnownStyle(engine, featuredStyle))
  return block.cakeStyleId
}

export const assignCakeStyle = (engine, block) => {
  if (block.sugarRush) {
    block.cakeStyleId = rememberStyle(engine, 'cake-golden-caramel')
    return block.cakeStyleId
  }
  const queue = engine.getVariable(constant.cakeRareQueue, [])
  if (queue.length) {
    block.cakeStyleId = rememberStyle(engine, queue[0])
    engine.setVariable(constant.cakeRareQueue, queue.slice(1))
    return block.cakeStyleId
  }
  return assignBaseStyle(engine, block)
}

export const queueCakeRewards = (engine, result) => {
  const { combo, floor, rating, towerRisk } = result
  if (combo > 0 && combo % 3 === 0) enqueueRareCake(engine, 'cake-star-sprinkle')
  if (floor === 10) enqueueRareCake(engine, 'cake-berry-jewel')
  if (floor >= 20 && rating === PERFECT && towerRisk >= 0.55) {
    enqueueRareCake(engine, 'cake-royal-macaron')
  }
}

const hasEarnedCrown = (styleId, context) => {
  const { rating, floor, combo, towerRisk, sugarRush, runPerfects } = context
  switch (styleId) {
    case 'cake-strawberry': return floor >= 20 && rating === PERFECT
    case 'cake-chocolate': return towerRisk >= 0.55 && rating === PERFECT
    case 'cake-lemon': return runPerfects >= 2
    case 'cake-blueberry':
    case 'cake-golden-caramel': return sugarRush && rating === PERFECT
    case 'cake-macaron': return floor >= 25
    case 'cake-star-sprinkle': return combo >= 3 && rating === PERFECT
    case 'cake-berry-jewel': return floor >= 10 && rating === PERFECT
    case 'cake-royal-macaron': return rating === PERFECT
    default: return false
  }
}

export const recordCakeLanding = (engine, block, result) => {
  const { rating, floor, combo, towerRisk } = result
  const styleId = block.cakeStyleId || 'cake-strawberry'
  const runPerfects = engine.getVariable(constant.cakeRunPerfects, {})
  const nextRunPerfects = rating === PERFECT
    ? (runPerfects[styleId] || 0) + 1
    : (runPerfects[styleId] || 0)
  engine.setVariable(constant.cakeRunPerfects, {
    ...runPerfects,
    [styleId]: nextRunPerfects
  })

  const collection = loadCollection()
  const previous = collection[styleId] || { placements: 0, perfects: 0, crowned: false }
  collection[styleId] = {
    placements: previous.placements + 1,
    perfects: previous.perfects + (rating === PERFECT ? 1 : 0),
    crowned: previous.crowned || hasEarnedCrown(styleId, {
      rating,
      floor,
      combo,
      towerRisk,
      sugarRush: Boolean(block.sugarRush),
      runPerfects: nextRunPerfects
    })
  }
  saveCollection(collection)
}

if (typeof window !== 'undefined') {
  window.SweetStackCakeCollection = {
    styles: cakeStyles,
    getSnapshot: getCakeCollectionSnapshot,
    getStage: getCakeCollectionStage
  }
}
