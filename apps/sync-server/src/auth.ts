import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const WRITE_ROLES = new Set(['owner', 'editor', 'admin'])

export async function verifyUserToken(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

/** Ensures the user may sync this document (owner or document_members row). Uses service role. */
export async function assertDocumentAccess(userId: string, documentId: string) {
  const { data: doc, error: docErr } = await supabaseAdmin
    .from('documents')
    .select('owner_id')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) throw new Error('Document not found')
  if (doc.owner_id === userId) return { role: 'owner' as const }

  const { data: member, error: memErr } = await supabaseAdmin
    .from('document_members')
    .select('id, role')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memErr || !member) throw new Error('Forbidden')
  return { role: member.role }
}

/** Ensures the user has write permission for sync mutations. */
export async function assertDocumentWriteAccess(userId: string, documentId: string) {
  const access = await assertDocumentAccess(userId, documentId)
  if (!WRITE_ROLES.has(access.role)) {
    throw new Error('Read-only role')
  }
  return access
}
