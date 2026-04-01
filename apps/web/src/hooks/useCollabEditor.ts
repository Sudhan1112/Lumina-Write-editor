import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import io, { Socket } from 'socket.io-client'
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

export function useCollabEditor(documentId: string, user: any) {
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
        .map((state: any) => state?.user as PresenceUser | undefined)
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
        .map((state: any) => state?.user as PresenceUser | undefined)
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
      })

      newSocket.on('doc:rejected', () => {
        console.warn('[sync] doc:rejected - not a member or document missing')
        setSyncRejectMessage(
          "Live sync is blocked: you are not on this document's access list, or the document does not exist. Ask the owner to invite you, then refresh."
        )
        setIsConnected(false)
        setConnectionState('error')
      })

      newSocket.on('doc:load', (stateBase64: string) => {
        const stateBinary = base64ToUint8Array(stateBase64)
        Y.applyUpdate(ydoc, stateBinary, 'remote')
      })

      newSocket.on('doc:broadcast', (updateBase64: string) => {
        const updateBinary = base64ToUint8Array(updateBase64)
        Y.applyUpdate(ydoc, updateBinary, 'remote')
      })

      newSocket.on('awareness:diff', (updateBase64: string) => {
        const update = base64ToUint8Array(updateBase64)
        applyAwarenessUpdate(awareness, update, 'remote')
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
