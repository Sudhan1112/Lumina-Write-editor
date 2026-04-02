import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const COMMENT_WRITE_ROLES = new Set(['owner', 'admin', 'editor', 'commenter'])
const COMMENT_MODERATE_ROLES = new Set(['owner', 'admin', 'editor'])

type DocumentRole = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

type CommentRow = {
  id: string
  document_id: string
  user_id: string
  content: string
  selection_text: string | null
  status: 'open' | 'resolved'
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
  author?: ProfileRow | ProfileRow[] | null
  resolver?: ProfileRow | ProfileRow[] | null
}

const COMMENT_SELECT = `
  id,
  document_id,
  user_id,
  content,
  selection_text,
  status,
  resolved_at,
  resolved_by,
  created_at,
  updated_at,
  author:profiles!document_comments_user_id_fkey(id, email, full_name, avatar_url),
  resolver:profiles!document_comments_resolved_by_fkey(id, email, full_name, avatar_url)
`

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile ?? null
}

function normalizeComment(comment: CommentRow) {
  return {
    ...comment,
    author: firstProfile(comment.author),
    resolver: firstProfile(comment.resolver),
  }
}

async function resolveDocumentRole(documentId: string, userId: string) {
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
    return { admin, role: 'owner' as const, document }
  }

  const { data: membership, error: membershipError } = await admin
    .from('document_members')
    .select('role')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    return { admin, error: NextResponse.json({ error: membershipError.message }, { status: 500 }) }
  }

  if (!membership) {
    return { admin, document, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { admin, role: membership.role as DocumentRole, document }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveDocumentRole(params.id, user.id)
  if (access.error) return access.error

  const { data, error } = await access.admin
    .from('document_comments')
    .select(COMMENT_SELECT)
    .eq('document_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const comments = ((data ?? []) as CommentRow[]).map(normalizeComment)

  return NextResponse.json({
    role: access.role,
    can_comment: COMMENT_WRITE_ROLES.has(access.role),
    can_moderate: COMMENT_MODERATE_ROLES.has(access.role),
    comments,
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveDocumentRole(params.id, user.id)
  if (access.error) return access.error

  if (!COMMENT_WRITE_ROLES.has(access.role)) {
    return NextResponse.json({ error: 'Your role cannot create comments' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const selectionText = typeof body?.selection_text === 'string' ? body.selection_text.trim() : ''

  if (!content) {
    return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 })
  }

  if (selectionText.length > 400) {
    return NextResponse.json({ error: 'Selection preview is too long (max 400 characters)' }, { status: 400 })
  }

  const { data, error } = await access.admin
    .from('document_comments')
    .insert({
      document_id: params.id,
      user_id: user.id,
      content,
      selection_text: selectionText || null,
      status: 'open',
    })
    .select(COMMENT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(normalizeComment(data as CommentRow))
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveDocumentRole(params.id, user.id)
  if (access.error) return access.error

  const body = await req.json().catch(() => ({}))
  const commentId = typeof body?.comment_id === 'string' ? body.comment_id : ''
  const hasContent = Object.prototype.hasOwnProperty.call(body, 'content')
  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')
  const contentInput = typeof body?.content === 'string' ? body.content.trim() : ''
  const statusInput = typeof body?.status === 'string' ? body.status.trim() : ''

  if (!commentId) {
    return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
  }

  if (!hasContent && !hasStatus) {
    return NextResponse.json({ error: 'Provide content or status to update' }, { status: 400 })
  }

  if (hasStatus && !['open', 'resolved'].includes(statusInput)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: existing, error: existingError } = await access.admin
    .from('document_comments')
    .select('id, user_id, status')
    .eq('id', commentId)
    .eq('document_id', params.id)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const updates: Record<string, string | null> = {}

  if (hasContent) {
    if (!contentInput) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 })
    }
    if (contentInput.length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the author can edit this comment' }, { status: 403 })
    }
    if (existing.status === 'resolved') {
      return NextResponse.json({ error: 'Reopen this comment before editing it' }, { status: 400 })
    }
    updates.content = contentInput
  }

  if (hasStatus && statusInput !== existing.status) {
    if (statusInput === 'resolved') {
      if (!COMMENT_WRITE_ROLES.has(access.role)) {
        return NextResponse.json({ error: 'Your role cannot resolve comments' }, { status: 403 })
      }
      updates.status = 'resolved'
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user.id
    } else {
      const canReopen = COMMENT_MODERATE_ROLES.has(access.role) || existing.user_id === user.id
      if (!canReopen) {
        return NextResponse.json({ error: 'You are not allowed to reopen this comment' }, { status: 403 })
      }
      updates.status = 'open'
      updates.resolved_at = null
      updates.resolved_by = null
    }
  }

  if (Object.keys(updates).length === 0) {
    const { data: unchanged, error: unchangedError } = await access.admin
      .from('document_comments')
      .select(COMMENT_SELECT)
      .eq('id', commentId)
      .single()

    if (unchangedError) return NextResponse.json({ error: unchangedError.message }, { status: 500 })
    return NextResponse.json(normalizeComment(unchanged as CommentRow))
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await access.admin
    .from('document_comments')
    .update(updates)
    .eq('id', commentId)
    .eq('document_id', params.id)
    .select(COMMENT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(normalizeComment(data as CommentRow))
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveDocumentRole(params.id, user.id)
  if (access.error) return access.error

  const url = new URL(req.url)
  const queryCommentId = url.searchParams.get('comment_id')
  const body = await req.json().catch(() => ({}))
  const bodyCommentId = typeof body?.comment_id === 'string' ? body.comment_id : null
  const commentId = queryCommentId || bodyCommentId || ''

  if (!commentId) {
    return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
  }

  const { data: existing, error: existingError } = await access.admin
    .from('document_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .eq('document_id', params.id)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const canDelete = COMMENT_MODERATE_ROLES.has(access.role) || existing.user_id === user.id
  if (!canDelete) {
    return NextResponse.json({ error: 'You are not allowed to delete this comment' }, { status: 403 })
  }

  const { error } = await access.admin
    .from('document_comments')
    .delete()
    .eq('id', commentId)
    .eq('document_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
