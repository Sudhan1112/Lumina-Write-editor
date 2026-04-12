import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import io, { Socket } from 'socket.io-client'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { base64ToUint8Array, uint8ArrayToBase64 } from '@/lib/base64'
import {
  getCursorSessionSeed,
  getStoredSessionCursorColor,
  normalizeCursorColor,
  pickDistinctCursorColor,
  setStoredSessionCursorColor,
} from '@/lib/cursorColors'

export type SyncConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'no_session'

type PresenceUser = {
  id: string
  name: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  color: string
}

function resolveSyncServerUrl(): string {
  let url = process.env.NEXT_PUBLIC_SYNC_SERVER_URL || 'http://localhost:4000'
  if (typeof window === 'undefined') return url
  if (window.location.protocol === 'https:' && /^http:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url)) {
    url = `https://${url.slice('http://'.length)}`
  }
  return url.replace(/\/$/, '')
}

function messageForSyncRejectReason(reason: string | undefined): string {
  switch (reason) {
    case 'write_forbidden':
      return 'Live editing is off for your role (viewer or commenter). You can read and comment, but only editors and above can change the document text. Ask for a higher role if you need to edit.'
    case 'presence_forbidden':
      return 'Live presence could not be updated—your access to this document may have changed. Refresh the page or ask the owner to confirm your membership.'
    case 'server_error':
      return 'The sync service hit an error loading this document. Wait a moment and refresh. If it keeps happening, the service may be down or misconfigured.'
    case 'invalid_update':
      return 'Live sync received invalid data and stopped for safety. Refresh the page to reconnect.'
    case 'invalid_document':
      return 'Live sync could not start because the document link is invalid. Go back and open the document again.'
    case 'access_denied':
    default:
      return "Live sync is blocked: you are not on this document's access list, or the document does not exist. Ask the owner to invite you, then refresh."
  }
}

function awarenessEntryUser(state: unknown): PresenceUser | undefined {
  if (!state || typeof state !== 'object') return undefined
  const candidate = (state as { user?: PresenceUser }).user
  return candidate?.id ? candidate : undefined
}

export function useCollabEditor(documentId: string, user: User) {
  const ydocRef = useRef<Y.Doc | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)
  const sessionSeedRef = useRef(getCursorSessionSeed())
  const colorRef = useRef(
    pickDistinctCursorColor({
      documentId,
      userId: user.id,
      sessionSeed: sessionSeedRef.current,
      existingColors: [],
      preferredColor: getStoredSessionCursorColor(documentId, user.id) ?? user.user_metadata?.color ?? null,
    })
  )

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
    awarenessRef.current = new Awareness(ydocRef.current)
  }
  const ydoc = ydocRef.current
  const awareness = awarenessRef.current!

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<SyncConnectionState>('idle')
  const [syncRejectMessage, setSyncRejectMessage] = useState<string | null>(null)
  const [sessionColor, setSessionColor] = useState(colorRef.current)

  useEffect(() => {
    const supabase = createClient()
    let newSocket: Socket | undefined

    const buildPresenceUser = (color: string): PresenceUser => {
      const fullName = user.user_metadata?.full_name ?? null
      return {
        id: user.id,
        name: fullName || user.email?.split('@')[0] || 'Unknown',
        fullName,
        email: user.email ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        color,
      }
    }

    const setLocalColor = (color: string) => {
      const normalized = normalizeCursorColor(color) || '#9A5B2B'
      setStoredSessionCursorColor(documentId, user.id, normalized)
      if (normalized === colorRef.current) return
      colorRef.current = normalized
      setSessionColor(normalized)
    }

    setLocalColor(
      pickDistinctCursorColor({
        documentId,
        userId: user.id,
        sessionSeed: sessionSeedRef.current,
        existingColors: [],
        preferredColor: getStoredSessionCursorColor(documentId, user.id) ?? user.user_metadata?.color ?? null,
      })
    )

    const collectOtherUsers = () =>
      Array.from(awareness.getStates().values())
        .map(awarenessEntryUser)
        .filter((presence): presence is PresenceUser => Boolean(presence?.id))
        .filter((presence) => presence.id !== user.id)

    const syncLocalPresence = (color: string) => {
      const nextPresence = buildPresenceUser(color)
      const currentPresence = awareness.getLocalState()?.user as PresenceUser | undefined
      if (
        currentPresence?.id === nextPresence.id &&
        currentPresence?.name === nextPresence.name &&
        currentPresence?.fullName === nextPresence.fullName &&
        currentPresence?.email === nextPresence.email &&
        currentPresence?.avatarUrl === nextPresence.avatarUrl &&
        currentPresence?.color === nextPresence.color
      ) {
        return
      }
      awareness.setLocalStateField('user', nextPresence)
    }

    const ensureDistinctColor = () => {
      const others = collectOtherUsers()
      const myColor = normalizeCursorColor(colorRef.current)
      const collidingUserIds = others
        .filter((presence) => normalizeCursorColor(presence.color) === myColor)
        .map((presence) => presence.id)

      const shouldRotate =
        Boolean(myColor) &&
        collidingUserIds.length > 0 &&
        [user.id, ...collidingUserIds].sort()[0] !== user.id

      if (myColor && !shouldRotate) {
        setLocalColor(myColor)
        syncLocalPresence(myColor)
        return
      }

      const nextColor = pickDistinctCursorColor({
        documentId,
        userId: user.id,
        sessionSeed: sessionSeedRef.current,
        existingColors: others.map((presence) => presence.color),
        preferredColor: getStoredSessionCursorColor(documentId, user.id),
      })

      setLocalColor(nextColor)
      syncLocalPresence(nextColor)
    }

    const onYdocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote' && newSocket?.connected) {
        newSocket.emit('doc:update', documentId, uint8ArrayToBase64(update))
      }
    }

    const onAwarenessUpdate = (_changes: unknown, origin: unknown) => {
      if (origin === 'local' && newSocket?.connected) {
        const update = encodeAwarenessUpdate(awareness, [awareness.clientID])
        newSocket.emit('awareness:update', documentId, uint8ArrayToBase64(update))
      }
      ensureDistinctColor()
      const states = Array.from(awareness.getStates().values())
        .map(awarenessEntryUser)
        .filter((presence): presence is PresenceUser => Boolean(presence?.id))
      setActiveUsers(states)
    }

    const joinDocument = (socket: Socket) => {
      socket.emit('doc:join', documentId)
      ensureDistinctColor()
      const initialAwareness = encodeAwarenessUpdate(awareness, [awareness.clientID])
      socket.emit('awareness:update', documentId, uint8ArrayToBase64(initialAwareness))
    }

    const initSocket = async () => {
      setConnectionState('connecting')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setConnectionState('no_session')
        setIsConnected(false)
        return
      }

      const url = resolveSyncServerUrl()
      newSocket = io(url, {
        auth: { token: session.access_token },
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        transports: ['polling', 'websocket'],
        withCredentials: true,
      })

      newSocket.on('connect', () => {
        setSyncRejectMessage(null)
        setIsConnected(true)
        setConnectionState('connected')
        joinDocument(newSocket!)
      })

      newSocket.on('reconnect', () => {
        setSyncRejectMessage(null)
        setIsConnected(true)
        setConnectionState('connected')
        joinDocument(newSocket!)
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
      })

      newSocket.on('connect_error', (err: Error) => {
        console.warn('[sync] connect_error', url, err.message)
        setIsConnected(false)
        setConnectionState('error')
        setSyncRejectMessage(
          `Could not reach the live sync server at ${url}. For local dev, run "npm run dev:server" from the repo root and check NEXT_PUBLIC_SYNC_SERVER_URL in apps/web/.env.local.`
        )
      })

      newSocket.on('doc:rejected', (payload?: { reason?: string }) => {
        const reason = typeof payload?.reason === 'string' ? payload.reason : undefined
        console.warn('[sync] doc:rejected', reason ?? '(no reason)')
        setSyncRejectMessage(messageForSyncRejectReason(reason))
        setIsConnected(false)
        setConnectionState('error')
      })

      newSocket.on('doc:load', (stateBase64: string) => {
        try {
          const stateBinary = base64ToUint8Array(stateBase64)
          Y.applyUpdate(ydoc, stateBinary, 'remote')
        } catch (e) {
          console.error('[sync] doc:load apply failed', e)
          setSyncRejectMessage(messageForSyncRejectReason('invalid_update'))
          setIsConnected(false)
          setConnectionState('error')
        }
      })

      newSocket.on('doc:broadcast', (updateBase64: string) => {
        try {
          const updateBinary = base64ToUint8Array(updateBase64)
          Y.applyUpdate(ydoc, updateBinary, 'remote')
        } catch (e) {
          console.error('[sync] doc:broadcast apply failed', e)
          setSyncRejectMessage(messageForSyncRejectReason('invalid_update'))
          setIsConnected(false)
          setConnectionState('error')
        }
      })

      newSocket.on('awareness:diff', (updateBase64: string) => {
        try {
          const update = base64ToUint8Array(updateBase64)
          applyAwarenessUpdate(awareness, update, 'remote')
        } catch (e) {
          console.error('[sync] awareness:diff apply failed', e)
        }
      })

      ydoc.on('update', onYdocUpdate)
      awareness.on('update', onAwarenessUpdate)
    }

    initSocket()

    return () => {
      ydoc.off('update', onYdocUpdate)
      awareness.off('update', onAwarenessUpdate)
      newSocket?.removeAllListeners()
      newSocket?.disconnect()
    }
  }, [documentId, ydoc, awareness, user])

  return { ydoc, awareness, activeUsers, isConnected, connectionState, syncRejectMessage, sessionColor }
}
