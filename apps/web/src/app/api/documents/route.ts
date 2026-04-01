import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type DocumentRow = {
  id: string
  title: string
  updated_at: string
  created_at: string
  owner_id: string
}

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

export async function GET() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()
    const userId = session.user.id

    const { data: ownDocs, error: ownDocsError } = await admin
      .from('documents')
      .select('id, title, updated_at, created_at, owner_id')
      .eq('owner_id', userId)

    if (ownDocsError) {
      return NextResponse.json({ error: ownDocsError.message }, { status: 500 })
    }

    const { data: membershipRows, error: membershipError } = await admin
      .from('document_members')
      .select('document_id')
      .eq('user_id', userId)

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    const ownDocIds = new Set((ownDocs ?? []).map((doc) => doc.id))
    const sharedDocIds = Array.from(
      new Set((membershipRows ?? []).map((row) => row.document_id).filter((docId) => !ownDocIds.has(docId)))
    )

    let sharedDocs: DocumentRow[] = []
    if (sharedDocIds.length > 0) {
      const { data, error } = await admin
        .from('documents')
        .select('id, title, updated_at, created_at, owner_id')
        .in('id', sharedDocIds)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      sharedDocs = data ?? []
    }

    const documents = [...(ownDocs ?? []), ...sharedDocs].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    if (documents.length === 0) return NextResponse.json([])

    const docIds = documents.map((doc) => doc.id)
    const ownerIds = Array.from(new Set(documents.map((doc) => doc.owner_id)))

    const [{ data: owners, error: ownersError }, { data: members, error: membersError }] = await Promise.all([
      admin.from('profiles').select('id, email, full_name, avatar_url').in('id', ownerIds),
      admin
        .from('document_members')
        .select('id, document_id, user_id, role, profiles(id, email, full_name, avatar_url)')
        .in('document_id', docIds),
    ])

    if (ownersError) {
      return NextResponse.json({ error: ownersError.message }, { status: 500 })
    }

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const ownerMap = new Map((owners ?? []).map((profile) => [profile.id, profile]))
    const membersByDocument = new Map<string, MemberRow[]>()

    for (const member of (members ?? []) as MemberRow[]) {
      const current = membersByDocument.get(member.document_id) ?? []
      current.push({ ...member, profiles: firstProfile(member.profiles) })
      membersByDocument.set(member.document_id, current)
    }

    const payload = documents.map((document) => ({
      ...document,
      owner: ownerMap.get(document.owner_id) ?? null,
      members: membersByDocument.get(document.id) ?? [],
    }))

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await req.json()

  const { data, error } = await supabase
    .from('documents')
    .insert({ title: title || 'Untitled Document', owner_id: session.user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    const admin = createAdminClient()
    const { error: memberError } = await admin.from('document_members').upsert(
      {
        document_id: data.id,
        user_id: session.user.id,
        role: 'owner',
      },
      { onConflict: 'document_id,user_id' }
    )

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json(data)
}
