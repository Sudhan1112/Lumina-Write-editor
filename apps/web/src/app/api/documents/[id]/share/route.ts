import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MANAGEABLE_ROLES = ['viewer', 'commenter', 'editor', 'admin'] as const

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

type MemberRow = {
  id: string
  document_id: string
  user_id: string
  role: string
  profiles?: ProfileRow | ProfileRow[] | null
}

function firstProfile(profile: MemberRow['profiles']) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile ?? null
}

async function assertOwner(documentId: string, actorId: string) {
  const supabase = createClient()
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('owner_id')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return { error: NextResponse.json({ error: 'Document not found' }, { status: 404 }) }
  }

  if (doc.owner_id !== actorId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ownerId: doc.owner_id }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', params.id)
    .single()

  if (documentError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  try {
    const admin = createAdminClient()
    const { data: members, error } = await admin
      .from('document_members')
      .select('id, document_id, user_id, role, profiles(id, email, full_name, avatar_url)')
      .eq('document_id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const normalizedMembers = ((members ?? []) as MemberRow[]).map((member) => ({
      ...member,
      profiles: firstProfile(member.profiles),
    }))

    const hasOwnerRow = normalizedMembers.some((member) => member.user_id === document.owner_id)

    if (!hasOwnerRow) {
      const { data: ownerProfile, error: ownerProfileError } = await admin
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', document.owner_id)
        .single()

      if (ownerProfileError) {
        return NextResponse.json({ error: ownerProfileError.message }, { status: 500 })
      }

      normalizedMembers.unshift({
        id: `owner-${params.id}`,
        document_id: params.id,
        user_id: document.owner_id,
        role: 'owner',
        profiles: ownerProfile,
      })
    }

    return NextResponse.json(normalizedMembers)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server configuration error'
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

  const body = await req.json()
  const user_id = body?.user_id as string | undefined
  const role = body?.role as string | undefined

  if (!user_id || !role) {
    return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })
  }

  if (!MANAGEABLE_ROLES.includes(role as (typeof MANAGEABLE_ROLES)[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const ownerCheck = await assertOwner(params.id, user.id)
  if (ownerCheck.error) return ownerCheck.error

  if (user_id === ownerCheck.ownerId) {
    return NextResponse.json({ error: 'Owner role cannot be changed via share' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { error: ownerMemberError } = await admin.from('document_members').upsert(
      {
        document_id: params.id,
        user_id: ownerCheck.ownerId,
        role: 'owner',
      },
      { onConflict: 'document_id,user_id' }
    )

    if (ownerMemberError) {
      return NextResponse.json({ error: ownerMemberError.message }, { status: 500 })
    }

    const { data, error } = await admin
      .from('document_members')
      .upsert({ document_id: params.id, user_id, role }, { onConflict: 'document_id,user_id' })
      .select('id, document_id, user_id, role, profiles(id, email, full_name, avatar_url)')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const payload = ((data ?? []) as MemberRow[]).map((member) => ({
      ...member,
      profiles: firstProfile(member.profiles),
    }))

    return NextResponse.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const user_id = typeof body?.user_id === 'string' ? body.user_id : ''
  const role = typeof body?.role === 'string' ? body.role : ''

  if (!user_id || !role) {
    return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })
  }

  if (!MANAGEABLE_ROLES.includes(role as (typeof MANAGEABLE_ROLES)[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const ownerCheck = await assertOwner(params.id, user.id)
  if (ownerCheck.error) return ownerCheck.error

  if (user_id === ownerCheck.ownerId) {
    return NextResponse.json({ error: 'Owner role cannot be changed' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('document_members')
      .upsert(
        {
          document_id: params.id,
          user_id,
          role,
        },
        { onConflict: 'document_id,user_id' }
      )
      .select('id, document_id, user_id, role, profiles(id, email, full_name, avatar_url)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { error: approveMatchingError } = await admin
      .from('document_access_requests')
      .update({ status: 'approved' })
      .eq('document_id', params.id)
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .eq('requested_role', role)

    if (approveMatchingError) {
      return NextResponse.json({ error: approveMatchingError.message }, { status: 500 })
    }

    const { error: rejectOthersError } = await admin
      .from('document_access_requests')
      .update({ status: 'rejected' })
      .eq('document_id', params.id)
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .neq('requested_role', role)

    if (rejectOthersError) {
      return NextResponse.json({ error: rejectOthersError.message }, { status: 500 })
    }

    const member = data as MemberRow
    return NextResponse.json({
      ...member,
      profiles: firstProfile(member.profiles),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const queryUserId = url.searchParams.get('user_id')
  const body = await req.json().catch(() => ({}))
  const bodyUserId = typeof body?.user_id === 'string' ? body.user_id : null
  const user_id = queryUserId || bodyUserId || ''

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const ownerCheck = await assertOwner(params.id, user.id)
  if (ownerCheck.error) return ownerCheck.error

  if (user_id === ownerCheck.ownerId) {
    return NextResponse.json({ error: 'Owner access cannot be revoked' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { error: deleteError } = await admin
      .from('document_members')
      .delete()
      .eq('document_id', params.id)
      .eq('user_id', user_id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    const { error: requestError } = await admin
      .from('document_access_requests')
      .update({ status: 'rejected' })
      .eq('document_id', params.id)
      .eq('user_id', user_id)
      .eq('status', 'pending')

    if (requestError) return NextResponse.json({ error: requestError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
