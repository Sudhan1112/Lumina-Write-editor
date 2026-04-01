function normalizeResponseText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? ''
  if (!firstLine) return ''

  const lower = firstLine.toLowerCase()
  if (lower.startsWith('<!doctype') || lower.startsWith('<html') || lower.startsWith('<head') || lower.startsWith('<body')) {
    return ''
  }

  return firstLine.length > 200 ? `${firstLine.slice(0, 197)}...` : firstLine
}

export async function readResponsePayload<T = unknown>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    const error = normalizeResponseText(text)
    return (error ? { error } : null) as T | null
  }
}

export function getResponseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const maybeError = 'error' in payload ? payload.error : undefined
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError.trim()

    const maybeMessage = 'message' in payload ? payload.message : undefined
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage.trim()
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim()
  }

  return fallback
}
