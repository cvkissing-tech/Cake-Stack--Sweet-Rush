const fs = require('fs')
const path = require('path')

const sampleRate = 22050

const createWav = (duration, renderSample) => {
  const sampleCount = Math.floor(sampleRate * duration)
  const dataSize = sampleCount * 2
  const output = Buffer.alloc(44 + dataSize)
  output.write('RIFF', 0)
  output.writeUInt32LE(36 + dataSize, 4)
  output.write('WAVE', 8)
  output.write('fmt ', 12)
  output.writeUInt32LE(16, 16)
  output.writeUInt16LE(1, 20)
  output.writeUInt16LE(1, 22)
  output.writeUInt32LE(sampleRate, 24)
  output.writeUInt32LE(sampleRate * 2, 28)
  output.writeUInt16LE(2, 32)
  output.writeUInt16LE(16, 34)
  output.write('data', 36)
  output.writeUInt32LE(dataSize, 40)
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, renderSample(index / sampleRate, duration)))
    output.writeInt16LE(Math.round(sample * 32760), 44 + (index * 2))
  }
  return output
}

const goodDuration = 0.13
const good = createWav(goodDuration, (time) => {
  const frequencyRise = (560 - 420) / goodDuration
  const phase = Math.PI * 2 * ((420 * time) + (0.5 * frequencyRise * (time ** 2)))
  const attack = Math.min(1, time / 0.012)
  const envelope = attack * Math.exp(-time * 18)
  return ((Math.sin(phase) * 0.82) + (Math.sin(phase * 2) * 0.18)) * envelope * 0.34
})

const rushDuration = 0.68
const rushNotes = [659.25, 783.99, 987.77, 1318.51]
const rush = createWav(rushDuration, (time) => {
  const noteLength = 0.13
  let sample = 0
  rushNotes.forEach((frequency, index) => {
    const localTime = time - (index * noteLength)
    if (localTime < 0 || localTime > 0.24) return
    const attack = Math.min(1, localTime / 0.008)
    const envelope = attack * Math.exp(-localTime * 10)
    const phase = Math.PI * 2 * frequency * localTime
    sample += ((Math.sin(phase) * 0.78) + (Math.sin(phase * 2) * 0.22)) * envelope
  })
  return sample * 0.19 * Math.exp(-time * 0.7)
})

fs.writeFileSync(path.resolve(__dirname, '..', 'assets', 'drop-safe.wav'), good)
fs.writeFileSync(path.resolve(__dirname, '..', 'assets', 'sugar-rush.wav'), rush)
console.log('Generated assets/drop-safe.wav and assets/sugar-rush.wav')
