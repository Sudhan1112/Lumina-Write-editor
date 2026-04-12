import { NextResponse } from 'next/server'

/** Standard JSON error shape for route handlers: `{ error: string }`. */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function jsonServerError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : 'Unexpected server error'
  return jsonError(message, 500)
}

/**
 * Parse JSON body; returns 400 if the body is missing or not valid JSON.
 * Use for POST/PATCH/DELETE when an object body is required.
 */
export async function parseJsonObject(
  req: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  try {
    const raw = await req.text()
    if (!raw.trim()) {
      return { ok: false, response: jsonError('Request body is required', 400) }
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, response: jsonError('JSON body must be an object', 400) }
    }
    return { ok: true, body: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, response: jsonError('Invalid JSON body', 400) }
  }
}

/** Like `parseJsonObject`, but an empty body becomes `{}` (for optional JSON on POST). */
export async function parseJsonObjectOptional(
  req: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  try {
    const raw = await req.text()
    if (!raw.trim()) return { ok: true, body: {} }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, response: jsonError('JSON body must be an object', 400) }
    }
    return { ok: true, body: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, response: jsonError('Invalid JSON body', 400) }
  }
}
