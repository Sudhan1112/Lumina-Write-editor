import { createClient } from '@supabase/supabase-js'

/** Server-only. Bypasses RLS — use only after verifying the user with the cookie client. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY (same service role secret as your sync server; optional fallback: SUPABASE_SERVICE_ROLE_KEY)'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
