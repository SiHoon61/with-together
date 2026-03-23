const AVATAR_COLORS = [
  { bg: '#D4EDA0', fg: '#3D6B00' },
  { bg: '#E6EEFA', fg: '#1860A8' },
  { bg: '#FAEEE6', fg: '#A03A10' },
  { bg: '#EEE8FA', fg: '#5030A0' },
  { bg: '#FAF0E0', fg: '#906000' },
  { bg: '#F0EDE6', fg: '#888888' },
]

function hashSeed(seed) {
  let h = 0
  for (const char of seed) h = (h * 31 + char.charCodeAt(0)) >>> 0
  return h
}

export function getAvatarAppearance(seed, label) {
  const normalizedSeed = (seed ?? '').trim() || 'withtogether'
  const normalizedLabel = (label ?? '').trim() || '?'
  const color = AVATAR_COLORS[hashSeed(normalizedSeed) % AVATAR_COLORS.length]

  return {
    ...color,
    text: normalizedLabel.slice(0, 2),
  }
}
