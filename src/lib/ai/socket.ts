/** ---------------------------------------------------------------
 *  The assistant's realtime channel — ported from fantastic-productive
 *  `src/lib/ai/socket.ts`.
 *
 *  Streaming only exists over Socket.io: the HTTP send returns after the
 *  whole run and the tokens arrive here. What this module owes the server
 *  (`ai-agent/src/socket-server/socket-server.ts`):
 *
 *  1. every emitted event carries the JWT — there is no handshake auth;
 *  2. rooms are lost on reconnect, so every open chat is re-subscribed
 *     on `connect`;
 *  3. only final messages are persisted — deltas heard while not in the
 *     room are gone, so subscribe *before* sending.
 *
 *  Transport is websocket-only on purpose: browsers do not apply CORS to
 *  a WebSocket upgrade and the server does not check the origin on one,
 *  whereas the polling handshake is CORS-gated to `*.productive.io`.
 *  Verified 2026-09-13: `path: ''` (what fantastic passes) is normalised
 *  by socket.io-client to the default `/socket.io`, which is where the
 *  server listens — so the default is used here.
 *  --------------------------------------------------------------- */

import { io, type Socket } from 'socket.io-client'
import { AI_AGENT_HOST } from '@/lib/config'
import { getJwt } from '@/lib/ai/auth'
import type { AgentSessionEvent } from '@/lib/ai/client'
import { randomUuid } from '@/lib/utils'

export interface SystemMessage {
  timestamp: number
  type: 'error'
  error: { code?: string; text: string; eventId?: string }
}

type EventHandler = (event: AgentSessionEvent) => void
type SystemHandler = (message: SystemMessage) => void
type ConnectionHandler = (state: ConnectionState) => void

export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'disconnected'; reason: string }
  | { status: 'error'; message: string }

/** Live subscriptions, so a reconnect can put them back. */
const rooms = new Set<string>()
const eventHandlers = new Map<string, Set<EventHandler>>()
const systemHandlers = new Set<SystemHandler>()
const connectHandlers = new Set<() => void>()
const connectionHandlers = new Set<ConnectionHandler>()

let socket: Socket | null = null
let connection: ConnectionState = { status: 'connecting' }

function setConnection(next: ConnectionState) {
  connection = next
  for (const handler of connectionHandlers) handler(next)
}

export function getConnectionState(): ConnectionState {
  return connection
}

function ensureSocket(): Socket {
  if (socket) return socket

  socket = io(AI_AGENT_HOST, {
    autoConnect: true,
    upgrade: false,
    transports: ['websocket'],
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect', () => {
    setConnection({ status: 'connected' })
    void (async () => {
      // Rooms do not survive a reconnect; put every open chat back.
      if (rooms.size > 0) {
        const token = await getJwt().catch(() => null)
        if (token) {
          for (const agentSessionId of rooms) {
            socket?.emit('subscribe', { jwt: token, agentSessionId })
          }
        }
      }
      // Re-joining replays nothing, so listeners are told to re-read the log.
      for (const handler of connectHandlers) handler()
    })()
  })

  socket.on('disconnect', (reason) => setConnection({ status: 'disconnected', reason }))
  socket.on('connect_error', (error) => setConnection({ status: 'error', message: error.message }))

  socket.on('agent-session-event', (payload: { event?: AgentSessionEvent }) => {
    const event = payload?.event
    if (!event?.agentSessionId) return
    for (const handler of eventHandlers.get(event.agentSessionId) ?? []) handler(event)
  })

  socket.on('system-message', (payload: { systemMessage?: SystemMessage }) => {
    if (!payload?.systemMessage) return
    for (const handler of systemHandlers) handler(payload.systemMessage)
  })

  // Kept from fantastic: if the server ever asks for the client's sources
  // config, silence means a 3s wait — an empty list answers immediately.
  socket.on('sources-config-request', ({ requestId }: { requestId: string }) => {
    socket?.emit('sources-config-response', { requestId, sourcesConfig: [] })
  })

  return socket
}

/**
 * Starts listening to one chat. Returns the unsubscribe.
 *
 * `onSubscribed` fires once the `subscribe` has been emitted — a message
 * sent before that would run the agent while nobody is listening.
 */
export function subscribeToChat(
  agentSessionId: string,
  onEvent: EventHandler,
  onSubscribed?: () => void,
): () => void {
  const active = ensureSocket()

  const handlers = eventHandlers.get(agentSessionId) ?? new Set<EventHandler>()
  handlers.add(onEvent)
  eventHandlers.set(agentSessionId, handlers)

  if (rooms.has(agentSessionId)) {
    onSubscribed?.()
  } else {
    rooms.add(agentSessionId)
    void getJwt().then((token) => {
      active.emit('subscribe', { jwt: token, agentSessionId })
      onSubscribed?.()
    })
  }

  return () => {
    const set = eventHandlers.get(agentSessionId)
    set?.delete(onEvent)
    if (set && set.size === 0) {
      eventHandlers.delete(agentSessionId)
      rooms.delete(agentSessionId)
      active.emit('unsubscribe', { agentSessionId })
    }
  }
}

/** Fires on every `connect`, reconnects included — the cue to re-read the log. */
export function onSocketConnect(handler: () => void): () => void {
  const active = ensureSocket()
  connectHandlers.add(handler)
  if (active.connected) handler()
  return () => connectHandlers.delete(handler)
}

export function onConnectionChange(handler: ConnectionHandler): () => void {
  ensureSocket()
  connectionHandlers.add(handler)
  handler(connection)
  return () => connectionHandlers.delete(handler)
}

export function onSystemMessage(handler: SystemHandler): () => void {
  ensureSocket()
  systemHandlers.add(handler)
  return () => systemHandlers.delete(handler)
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

async function emitEvent(event: Omit<AgentSessionEvent, 'id' | 'timestamp'>) {
  const active = ensureSocket()
  const token = await getJwt()
  active.emit('agent-session-event', {
    jwt: token,
    event: { id: randomUuid(), timestamp: Date.now(), ...event },
  })
}

/**
 * Sends over the socket, which is what streams the reply. Payload key equals
 * the event type (`type: 'message'` → `message: { text }`).
 */
export function sendChatMessage(agentSessionId: string, text: string) {
  return emitEvent({
    agentSessionId,
    type: 'message',
    actor: 'client',
    message: { text },
    context: { items: [] },
  })
}

export function stopChatRun(agentSessionId: string) {
  return emitEvent({
    agentSessionId,
    type: 'command',
    actor: 'client',
    command: { name: 'stop-current-run', params: {} },
  })
}

/** Dropped on sign-out. */
export function closeSocket() {
  socket?.disconnect()
  socket = null
  rooms.clear()
  eventHandlers.clear()
  systemHandlers.clear()
  connectHandlers.clear()
}
