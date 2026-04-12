import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsonServerError } from '@/lib/api-route-errors'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    if (!q) return NextResponse.json([])

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .ilike('email', `%${q}%`)
      .limit(5)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return jsonServerError(e)
  }
}
