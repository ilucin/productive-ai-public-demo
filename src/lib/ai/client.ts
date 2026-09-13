/** ---------------------------------------------------------------
 *  The assistant's REST surface — ported from fantastic-productive
 *  `src/lib/ai/client.ts`, trimmed to what a public demo needs.
 *
 *  One chat is an `AgentSession`; everything inside it — messages,
 *  streamed deltas, tool steps, questions, status changes — is an
 *  `AgentSessionEvent` on an append-only log. Types are cross-checked
 *  with ai-agent `src/agent/events.ts`.
 *
 *  Deliberately absent: `GET /agent-sessions` (the listing). Every
 *  visitor of this demo shares one Productive user, so the server-side
 *  list would show strangers' chats. The list lives in localStorage.
 *  --------------------------------------------------------------- */

import { AGENT_CONFIG, AI_AGENT_HOST, CLIENT_TYPE } from '@/lib/config'
import { clearJwt, getJwt } from '@/lib/ai/auth'

/* -------------------------------------------------------------- */
/*  Shapes                                                         */
/* -------------------------------------------------------------- */

export type AgentSessionStatusType =
  | 'idle'
  | 'processing'
  | 'waiting-confirmation'
  | 'waiting-question'
  | 'error'

export interface AgentSessionStatus {
  type: AgentSessionStatusType
  text: string
  updatedAtTimestamp: number
}

export interface AgentSessionPlan {
  items: { text: string; done: boolean }[]
}

export interface AgentSession {
  id: string
  title: string
  clientType: string
  createdAt: string
  lastActivityAt: string
  lastActivityTimestamp?: number
  userId?: string
  personId?: string
  organizationId?: string
  agentId?: string
  config?: { model?: string; reasoningEffort?: string; flags?: Record<string, boolean> }
  status?: AgentSessionStatus
  plan?: AgentSessionPlan
  /** Present on `GET /agent-sessions/:id`; the persisted log (no stream deltas). */
  events?: AgentSessionEvent[]
}

export type AgentSessionEventType =
  | 'message'
  | 'message-stream'
  | 'status'
  | 'processing-step'
  | 'thought'
  | 'plan'
  | 'confirmation'
  | 'resolved-confirmation'
  | 'question'
  | 'resolved-question'
  | 'context-action'
  | 'context'
  | 'config'
  | 'command'
  | 'system-event'
  | 'debug'

export interface SuggestedNextAction {
  label: string
  prompt: string
}

export interface ProcessingStepPayload {
  id: string
  kind: 'thinking' | 'action'
  label: string
  status: 'running' | 'done' | 'error'
  startedAt?: number
  endedAt?: number
  toolName?: string
  error?: string
}

export interface ConfirmationPayload {
  id: string
  agent?: string
  text: string
  interruptions?: {
    type: string
    agent: string
    item: { id: string; name: string; arguments?: string }
  }[]
}

export interface QuestionPayload {
  id: string
  questions: {
    question: string
    options?: { label: string; description?: string }[]
    multiSelect?: boolean
  }[]
}

export interface AgentSessionEvent {
  id: string
  agentSessionId: string
  timestamp: number
  type: AgentSessionEventType
  actor: 'client' | 'agent'
  message?: {
    text: string
    errorCode?: string
    errorParams?: Record<string, string>
    /** Correlates the final message with the deltas it was streamed from. */
    messageStreamId?: string
    suggestedActions?: SuggestedNextAction[]
    source?: string
  }
  messageStream?: { messageStreamId: string; index: number; text: string }
  status?: AgentSessionStatus
  processingStep?: ProcessingStepPayload
  thought?: { id: string; text: string; createdAt: number }
  plan?: AgentSessionPlan
  confirmation?: ConfirmationPayload
  question?: QuestionPayload
  systemEvent?: { type: 'credits-exceeded' | 'session-credits-exceeded' | string }
  command?: { name: string; params?: Record<string, unknown> }
  context?: { items?: unknown[] }
}

export interface EventsPage {
  items: AgentSessionEvent[]
  nextCursor: number | null
}

/* -------------------------------------------------------------- */
/*  HTTP                                                           */
/* -------------------------------------------------------------- */

export class AgentError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AgentError'
    this.status = status
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the assistant. Check your connection and try again.')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const jwt = await getJwt()

  let response: Response
  try {
    response = await fetch(`${AI_AGENT_HOST}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
  } catch (error) {
    throw new NetworkError(error)
  }

  if (!response.ok) {
    // A stale token is the one failure worth retrying from the top.
    if (response.status === 401) clearJwt()
    const text = await response.text().catch(() => '')
    throw new AgentError(response.status, text || `Assistant request failed (${response.status})`)
  }
  if (response.status === 204) return null as T
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

/** Models the backend accepts — `AGENT_CONFIG.model` must be one of them. */
export function getConfig() {
  return call<{ availableModels: string[] }>('/agent-sessions/config')
}

/**
 * Creates an empty chat with the demo's fixed model config. The agent does
 * not run until a message is sent, so this is cheap.
 */
export function createSession(input: { title?: string } = {}) {
  return call<AgentSession>('/agent-sessions', {
    method: 'POST',
    body: {
      clientType: CLIENT_TYPE,
      ...(input.title ? { title: input.title } : {}),
      config: { ...AGENT_CONFIG, appHost: window.location.origin },
    },
  })
}

/** The chat plus its persisted events and current status. */
export function getSession(id: string) {
  return call<AgentSession>(`/agent-sessions/${id}`)
}

/** The persisted log, paginated. Stream deltas are never replayed. */
export function getEvents(id: string, { cursor, limit = 50 }: { cursor?: number; limit?: number } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor != null) params.set('cursor', String(cursor))
  return call<EventsPage>(`/agent-sessions/${id}/events?${params}`)
}

export function deleteSession(id: string) {
  return call<null>(`/agent-sessions/${id}`, { method: 'DELETE' })
}

/**
 * The HTTP way to send — **blocks until the run finishes** (minutes) and
 * streams nothing back. The socket is the normal path; this is the fallback
 * when the socket cannot connect.
 */
export function sendMessageHttp(id: string, text: string) {
  return call<null>(`/agent-sessions/${id}/messages`, {
    method: 'POST',
    body: { agentSessionId: id, message: { text } },
  })
}

export function resolveConfirmation(id: string, confirmationId: string, value: boolean) {
  return call<null>(`/agent-sessions/${id}/confirmations`, {
    method: 'POST',
    body: { agentSessionId: id, confirmationId, value },
  })
}

export function resolveQuestion(id: string, questionId: string, answers: Record<string, string>) {
  return call<null>(`/agent-sessions/${id}/questions`, {
    method: 'POST',
    body: { agentSessionId: id, questionId, answers },
  })
}
