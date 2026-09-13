export const enqueuePrompt = (queue, prompt) => {
  if (!prompt || !prompt.id || queue.some(item => item.id === prompt.id)) return queue.slice()
  const order = queue.reduce((max, item) => Math.max(max, item.order || 0), 0) + 1
  return queue.concat([{ ...prompt, order }]).sort((first, second) => (
    (second.priority || 0) - (first.priority || 0) || first.order - second.order
  ))
}

export const dequeuePrompt = (queue) => ({
  prompt: queue.length ? queue[0] : null,
  queue: queue.slice(1)
})
