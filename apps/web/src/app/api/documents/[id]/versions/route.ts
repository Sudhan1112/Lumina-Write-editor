import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

type VersionRow = {
  id: string
  document_id: string
  yjs_state: string
  created_by: string | null
  label: string | null
  created_at: string
  profiles?: ProfileRow | ProfileRow[] | null
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile ?? null
}

async function canAccessDocument(documentId: string, userId: string) {
  const admin = createAdminClient()
  const { data: document, error: documentError } = await admin
    .from('documents')
    .select('id, owner_id')
    .eq('id', documentId)
    .single()

  if (documentError || !document) {
    return { admin, error: NextResponse.json({ error: 'Document not found' }, { status: 404 }) }
  }

  if (document.owner_id === userId) {
    return { admin, document, authorized: true as const }
  }

  const { data: membership, error: membershipError } = await admin
    .from('document_members')
    .select('id')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    return { admin, error: NextResponse.json({ error: membershipError.message }, { status: 500 }) }
  }

  if (!membership) {
    return { admin, document, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { admin, document, authorized: true as const }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await canAccessDocument(params.id, user.id)
  if (access.error) return access.error

  try {
    const { data, error } = await access.admin
      .from('document_versions')
      .select('id, document_id, yjs_state, created_by, label, created_at, profiles(id, email, full_name, avatar_url)')
      .eq('document_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const versions = ((data ?? []) as VersionRow[]).map((version) => ({
      ...version,
      profiles: firstProfile(version.profiles),
    }))

    return NextResponse.json(versions)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await canAccessDocument(params.id, user.id)
  if (access.error) return access.error

  const body = await req.json().catch(() => ({}))
  const yjsState = typeof body?.yjs_state === 'string' ? body.yjs_state : ''
  const label = typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : 'Auto-save'

  if (!yjsState) {
    return NextResponse.json({ error: 'yjs_state is required' }, { status: 400 })
  }

  try {
    const { data: latestVersion, error: latestError } = await access.admin
      .from('document_versions')
      .select('id, yjs_state')
      .eq('document_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) {
      return NextResponse.json({ error: latestError.message }, { status: 500 })
    }

    if (latestVersion && latestVersion.yjs_state === yjsState) {
      return NextResponse.json({ id: latestVersion.id, skipped: true })
    }

    const { data, error } = await access.admin
      .from('document_versions')
      .insert({
        document_id: params.id,
        yjs_state: yjsState,
        created_by: user.id,
        label,
      })
      .select('id, document_id, yjs_state, created_by, label, created_at, profiles(id, email, full_name, avatar_url)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const version = data as VersionRow

    return NextResponse.json({
      ...version,
      profiles: firstProfile(version.profiles),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
