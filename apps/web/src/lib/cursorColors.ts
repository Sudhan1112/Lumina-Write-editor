const CURSOR_COLOR_PALETTE = [
  '#D14343',
  '#C65A0A',
  '#B27900',
  '#5C8A00',
  '#00875A',
  '#007C91',
  '#1366D6',
  '#5B5BD6',
  '#8E44AD',
  '#B83280',
  '#E5533D',
  '#D18900',
  '#6F9E00',
  '#00A878',
  '#0097B2',
  '#1F7AE0',
  '#5E60CE',
  '#7B2CBF',
  '#BC4B51',
  '#C97C5D',
  '#9C6644',
  '#2A9D8F',
  '#4D908E',
  '#577590',
] as const

const CURSOR_SESSION_SEED_KEY = 'lumina-cursor-session-seed'
const CURSOR_COLOR_PREFIX = 'lumina-cursor-color'

function normalizeHexColor(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null
  if (trimmed.length === 7) return trimmed.toUpperCase()
  return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase()
}

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = s / 100
  const lightness = l / 100

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const segment = h / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (segment >= 0 && segment < 1) {
    red = chroma
    green = x
  } else if (segment >= 1 && segment < 2) {
    red = x
    green = chroma
  } else if (segment >= 2 && segment < 3) {
    green = chroma
    blue = x
  } else if (segment >= 3 && segment < 4) {
    green = x
    blue = chroma
  } else if (segment >= 4 && segment < 5) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  const match = lightness - chroma / 2
  const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase()
}

function makeSessionColorStorageKey(documentId: string, userId: string) {
  return `${CURSOR_COLOR_PREFIX}:${documentId}:${userId}`
}

export function getCursorSessionSeed() {
  if (typeof window === 'undefined') return 'server-seed'
  const existing = window.sessionStorage.getItem(CURSOR_SESSION_SEED_KEY)
  if (existing) return existing
  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  window.sessionStorage.setItem(CURSOR_SESSION_SEED_KEY, next)
  return next
}

export function getStoredSessionCursorColor(documentId: string, userId: string) {
  if (typeof window === 'undefined') return null
  return normalizeHexColor(window.sessionStorage.getItem(makeSessionColorStorageKey(documentId, userId)))
}

export function setStoredSessionCursorColor(documentId: string, userId: string, color: string) {
  if (typeof window === 'undefined') return
  const normalized = normalizeHexColor(color)
  if (!normalized) return
  window.sessionStorage.setItem(makeSessionColorStorageKey(documentId, userId), normalized)
}

function buildColorCandidates(seed: string) {
  const start = hashString(seed) % CURSOR_COLOR_PALETTE.length
  const rotatedPalette = CURSOR_COLOR_PALETTE.map((_, index) => CURSOR_COLOR_PALETTE[(start + index) % CURSOR_COLOR_PALETTE.length]!)

  const generatedFallback = Array.from({ length: 18 }, (_, index) => {
    const hue = (hashString(`${seed}:${index}`) + index * 31) % 360
    return hslToHex(hue, 62, 52)
  })

  return [...rotatedPalette, ...generatedFallback]
}

function collectUsedColors(colors: Array<string | null | undefined>) {
  return new Set(
    colors
      .map((color) => normalizeHexColor(color))
      .filter((color): color is string => Boolean(color))
  )
}

export function pickDistinctCursorColor(options: {
  documentId: string
  userId: string
  sessionSeed: string
  existingColors: Array<string | null | undefined>
  preferredColor?: string | null
}) {
  const { documentId, userId, sessionSeed, existingColors, preferredColor } = options
  const usedColors = collectUsedColors(existingColors)
  const normalizedPreferred = normalizeHexColor(preferredColor)

  if (normalizedPreferred && !usedColors.has(normalizedPreferred)) {
    return normalizedPreferred
  }

  const seed = `${documentId}:${userId}:${sessionSeed}`
  const candidates = buildColorCandidates(seed)
  const available = candidates.find((candidate) => !usedColors.has(candidate))
  if (available) return available
  return candidates[0] || '#9A5B2B'
}

export function normalizeCursorColor(value: string | null | undefined) {
  return normalizeHexColor(value)
}
