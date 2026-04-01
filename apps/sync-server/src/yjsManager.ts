import * as Y from 'yjs'
import { supabaseAdmin } from './auth'

const docs = new Map<string, Y.Doc>()
const saveTimeouts = new Map<string, NodeJS.Timeout>()

export async function getOrCreateDoc(documentId: string): Promise<Y.Doc> {
  if (docs.has(documentId)) {
    return docs.get(documentId)!
  }

  const doc = new Y.Doc()
  
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('yjs_state')
      .eq('id', documentId)
      .single()

    if (!error && data?.yjs_state) {
      const stateBinary = Buffer.from(data.yjs_state, 'base64')
      Y.applyUpdate(doc, stateBinary)
    }
  } catch (err) {
    console.error('Failed to load document from DB', err)
  }

  docs.set(documentId, doc)
  return doc
}

export function schedulePersist(documentId: string, doc: Y.Doc) {
  if (saveTimeouts.has(documentId)) {
    clearTimeout(saveTimeouts.get(documentId)!)
  }

  const timeoutId = setTimeout(async () => {
    try {
      const stateBinary = Y.encodeStateAsUpdate(doc)
      const stateBase64 = Buffer.from(stateBinary).toString('base64')
      
      await supabaseAdmin
        .from('documents')
        .update({ yjs_state: stateBase64, updated_at: new Date().toISOString() })
        .eq('id', documentId)
      
      saveTimeouts.delete(documentId)
    } catch (err) {
      console.error('Failed to save document to DB', err)
    }
  }, 2000)

  saveTimeouts.set(documentId, timeoutId)
}

export async function saveVersion(documentId: string, doc: Y.Doc, user_id: string, label: string = 'Auto-save') {
    const stateBinary = Y.encodeStateAsUpdate(doc)
    const stateBase64 = Buffer.from(stateBinary).toString('base64')

    try {
        await supabaseAdmin.from('document_versions').insert({
            document_id: documentId,
            yjs_state: stateBase64,
            created_by: user_id,
            label
        })
        
        const { data: versions } = await supabaseAdmin
            .from('document_versions')
            .select('id')
            .eq('document_id', documentId)
            .order('created_at', { ascending: true })

        if (versions && versions.length > 20) {
            const idsToDelete = versions.slice(0, versions.length - 20).map(v => v.id)
            if (idsToDelete.length > 0) {
                await supabaseAdmin.from('document_versions').delete().in('id', idsToDelete)
            }
        }
    } catch (err) {
        console.error('Failed to save document version to DB', err)
    }
}
