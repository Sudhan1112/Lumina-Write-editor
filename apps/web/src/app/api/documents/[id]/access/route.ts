import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REQUESTABLE_ROLES = ['viewer', 'commenter', 'editor', 'admin'] as const

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

type AccessRequestRow = {
  id: string
  document_id: string
  user_id: string
  requested_role: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles?: ProfileRow | ProfileRow[] | null
}

type AccessRequestResponse = {
  id: string
  document_id: string
  user_id: string
  requested_role: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles: ProfileRow | null
  current_role: string | null
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile ?? null
}

function normalizeAccessRequest(request: AccessRequestRow | null, currentRole: string | null = null): AccessRequestResponse | null {
  if (!request) return null
  return {
    ...request,
    profiles: firstProfile(request.profiles),
    current_role: currentRole,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()

    const { data: document, error: documentError } = await admin
      .from('documents')
      .select('id, title, owner_id')
      .eq('id', params.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const isOwner = document.owner_id === user.id

    const [{ data: ownerProfile, error: ownerError }, { data: membership, error: membershipError }, { data: ownRequest, error: ownRequestError }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', document.owner_id)
        .single(),
      admin
        .from('document_members')
        .select('id, document_id, user_id, role, profiles(id, email, full_name, avatar_url)')
        .eq('document_id', params.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('document_access_requests')
        .select('id, document_id, user_id, requested_role, status, created_at, profiles(id, email, full_name, avatar_url)')
        .eq('document_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (ownerError) {
      return NextResponse.json({ error: ownerError.message }, { status: 500 })
    }

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    if (ownRequestError) {
      return NextResponse.json({ error: ownRequestError.message }, { status: 500 })
    }

    let pendingRequests: AccessRequestResponse[] = []

    const normalizedMembership = membership
      ? {
          ...(membership as MemberRow),
          profiles: firstProfile((membership as MemberRow).profiles),
        }
      : null

    const isAdminMember = normalizedMembership?.role === 'admin'
    const canModerateAccessRequests = isOwner || isAdminMember

    if (canModerateAccessRequests) {
      const { data: ownerRequests, error: ownerRequestsError } = await admin
        .from('document_access_requests')
        .select('id, document_id, user_id, requested_role, status, created_at, profiles(id, email, full_name, avatar_url)')
        .eq('document_id', params.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (ownerRequestsError) {
        return NextResponse.json({ error: ownerRequestsError.message }, { status: 500 })
      }

      const requestRows = (ownerRequests ?? []) as AccessRequestRow[]
      const requestUserIds = requestRows.map((request) => request.user_id)
      const roleByUser = new Map<string, string>()

      if (requestUserIds.length > 0) {
        const { data: requesterMemberships, error: requesterMembershipsError } = await admin
          .from('document_members')
          .select('user_id, role')
          .eq('document_id', params.id)
          .in('user_id', requestUserIds)

        if (requesterMembershipsError) {
          return NextResponse.json({ error: requesterMembershipsError.message }, { status: 500 })
        }

        for (const membership of requesterMemberships ?? []) {
          roleByUser.set(membership.user_id, membership.role)
        }
      }

      pendingRequests = requestRows
        .map((request) => normalizeAccessRequest(request, roleByUser.get(request.user_id) ?? null))
        .filter((request): request is AccessRequestResponse => request !== null)
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
      },
      owner: ownerProfile,
      isOwner,
      hasAccess: isOwner || Boolean(normalizedMembership),
      role: isOwner ? 'owner' : normalizedMembership?.role ?? null,
      latestRequest: normalizeAccessRequest((ownRequest as AccessRequestRow | null) ?? null, normalizedMembership?.role ?? null),
      pendingRequests,
      canModerateAccessRequests,
    })
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

  const body = await req.json().catch(() => ({}))
  const requested_role = typeof body?.requested_role === 'string' ? body.requested_role : 'editor'

  if (!REQUESTABLE_ROLES.includes(requested_role as (typeof REQUESTABLE_ROLES)[number])) {
    return NextResponse.json({ error: 'Invalid requested role' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data: document, error: documentError } = await admin
      .from('documents')
      .select('id, owner_id')
      .eq('id', params.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.owner_id === user.id) {
      return NextResponse.json({ error: 'You already own this document' }, { status: 400 })
    }

    const { data: existingMembership, error: membershipError } = await admin
      .from('document_members')
      .select('id, role')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    if (existingMembership?.role === requested_role) {
      return NextResponse.json({ error: `You already have ${requested_role} access` }, { status: 400 })
    }

    const { data: pendingRequest, error: pendingError } = await admin
      .from('document_access_requests')
      .select('id, document_id, user_id, requested_role, status, created_at')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    if (pendingRequest) {
      if (pendingRequest.requested_role === requested_role) {
        return NextResponse.json(pendingRequest)
      }

      const { data: updatedPending, error: updatePendingError } = await admin
        .from('document_access_requests')
        .update({ requested_role })
        .eq('id', pendingRequest.id)
        .select('id, document_id, user_id, requested_role, status, created_at')
        .single()

      if (updatePendingError) {
        return NextResponse.json({ error: updatePendingError.message }, { status: 500 })
      }

      return NextResponse.json(updatedPending)
    }

    const { data, error } = await admin
      .from('document_access_requests')
      .insert({
        document_id: params.id,
        user_id: user.id,
        requested_role,
        status: 'pending',
      })
      .select('id, document_id, user_id, requested_role, status, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error'
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
  const requestId = typeof body?.request_id === 'string' ? body.request_id : ''
  const status = typeof body?.status === 'string' ? body.status : ''

  if (!requestId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'request_id and a valid status are required' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data: document, error: documentError } = await admin
      .from('documents')
      .select('id, owner_id')
      .eq('id', params.id)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: actorMembership, error: actorMembershipError } = await admin
      .from('document_members')
      .select('role')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (actorMembershipError) {
      return NextResponse.json({ error: actorMembershipError.message }, { status: 500 })
    }

    const isAdminActor = actorMembership?.role === 'admin'
    if (document.owner_id !== user.id && !isAdminActor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: requestRow, error: requestError } = await admin
      .from('document_access_requests')
      .select('id, document_id, user_id, requested_role, status, created_at')
      .eq('id', requestId)
      .eq('document_id', params.id)
      .single()

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    if (requestRow.status !== 'pending') {
      return NextResponse.json({ error: 'Access request has already been handled' }, { status: 400 })
    }

    if (status === 'approved') {
      if (!REQUESTABLE_ROLES.includes(requestRow.requested_role as (typeof REQUESTABLE_ROLES)[number])) {
        return NextResponse.json({ error: 'Invalid requested role' }, { status: 400 })
      }

      const { error: memberError } = await admin.from('document_members').upsert(
        {
          document_id: params.id,
          user_id: requestRow.user_id,
          role: requestRow.requested_role,
        },
        { onConflict: 'document_id,user_id' }
      )

      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }
    }

    const { data: updatedRequest, error: updateError } = await admin
      .from('document_access_requests')
      .update({ status })
      .eq('id', requestId)
      .select('id, document_id, user_id, requested_role, status, created_at')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { error: staleRequestError } = await admin
      .from('document_access_requests')
      .update({ status: 'rejected' })
      .eq('document_id', params.id)
      .eq('user_id', requestRow.user_id)
      .eq('status', 'pending')
      .neq('id', requestId)

    if (staleRequestError) {
      return NextResponse.json({ error: staleRequestError.message }, { status: 500 })
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
