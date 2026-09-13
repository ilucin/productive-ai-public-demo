/** ---------------------------------------------------------------
 *  One chat's state — a trimmed port of fantastic-productive
 *  `src/hooks/use-ai-chat.ts` (`useChat` + `dedupeMessages`).
 *
 *  Two halves that have to agree:
 *  - **persisted** — `GET /agent-sessions/:id` returns the log (messages
 *    only; deltas are never replayed) plus the session's `status`;
 *  - **live** — the socket appends events as they happen, including the
 *    token-by-token deltas.
 *
 *  So the state is the log plus everything the socket added since, deduped
 *  by id (and by `messageStreamId` / text, since the two sides give the same
 *  message different ids), with in-flight deltas held aside until the final
 *  message replaces them.
 *
 *  Steps, thoughts, plan, confirmation, question and credits are already
 *  folded here so the UI for them (agent 4) only has to render `ChatState`.
 *  --------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSession,
  resolveConfirmation,
  resolveQuestion,
  sendMessageHttp,
  type AgentSession,
  type AgentSessionEvent,
  type AgentSessionStatus,
  type ConfirmationPayload,
  type QuestionPayload,
} from '@/lib/ai/client'
import {
  isSocketConnected,
  onSocketConnect,
  onSystemMessage,
  sendChatMessage,
  stopChatRun,
  subscribeToChat,
  type SystemMessage,
} from '@/lib/ai/socket'
import { randomUuid } from '@/lib/utils'

export const chatQueryKey = (sessionId: string | null) => ['chat', sessionId ?? 'none'] as const

/** A reply being written: deltas arrive one at a time and are appended. */
export interface StreamingMessage {
  messageStreamId: string
  text: string
}

export interface ProcessingStep {
  id: string
  kind: 'thinking' | 'action'
  label: string
  status: 'running' | 'done' | 'error'
  toolName?: string
  error?: string
}

export interface ChatState {
  session: AgentSession | undefined
  /** Persisted + live `message` events, in timestamp order, deltas excluded. */
  events: AgentSessionEvent[]
  streaming: StreamingMessage | null
  steps: ProcessingStep[]
  thoughts: { id: string; text: string }[]
  plan: { text: string; done: boolean }[]
  status: AgentSessionStatus | null
  /** Set when the agent is waiting on the user. */
  confirmation: ConfirmationPayload | null
  question: QuestionPayload | null
  /** Set when credits ran out; the composer should lock. */
  blocked: string | null
  error: string | null
  isPending: boolean
  isBusy: boolean
  /** False until the socket room is joined — nothing should be sent before. */
  isSubscribed: boolean
}

const isBusyStatus = (status: AgentSessionStatus | null) =>
  status?.type === 'processing' ||
  status?.type === 'waiting-confirmation' ||
  status?.type === 'waiting-question'

/** A busy status older than this is a run that died without saying so. */
const STATUS_GOES_STALE_AFTER_MS = 2 * 60 * 1000
/** How often the log is re-read while a run is in flight. */
const RUN_POLL_MS = 5000
/** How long the poll keeps going after a send, before the first status lands. */
const RUN_GRACE_MS = 12_000
/** Two agent messages this far apart are two answers, not one seen twice. */
const SAME_REPLY_WINDOW_MS = 2 * 60 * 1000
/** How close two copies of the same client text have to be to be one message. */
const CLIENT_ECHO_WINDOW_MS = 60 * 1000

/**
 * Drops the second copy of a message that arrived twice under two ids: the
 * socket delivers one (uuid), the log persists another (numeric). Agent
 * messages dedupe on `messageStreamId`, then on text within a window; client
 * messages are counted per source within a cluster of identical text, so a
 * genuine repeat ("ok", "ok") still shows twice.
 */
export function dedupeMessages(
  events: AgentSessionEvent[],
  liveIds: ReadonlySet<string> = new Set(),
): AgentSessionEvent[] {
  const byStream = new Map<string, number>()
  const byText = new Map<string, number>()
  const clients = new Map<string, { at: number; live: number; log: number; shown: number }>()
  const out: AgentSessionEvent[] = []

  for (const event of events) {
    if (event.type !== 'message') {
      out.push(event)
      continue
    }

    const text = event.message?.text ?? ''

    if (event.actor === 'client') {
      const open = clients.get(text)
      const cluster =
        open && event.timestamp - open.at < CLIENT_ECHO_WINDOW_MS
          ? open
          : { at: event.timestamp, live: 0, log: 0, shown: 0 }
      cluster.at = event.timestamp
      if (liveIds.has(event.id)) cluster.live += 1
      else cluster.log += 1
      clients.set(text, cluster)

      if (cluster.shown >= Math.max(cluster.live, cluster.log)) continue
      cluster.shown += 1
      out.push(event)
      continue
    }

    const streamId = event.message?.messageStreamId
    if (streamId) {
      if (byStream.has(streamId)) continue
      byStream.set(streamId, event.timestamp)
      out.push(event)
      continue
    }

    const seenAt = byText.get(text)
    if (seenAt != null && event.timestamp - seenAt < SAME_REPLY_WINDOW_MS) continue
    byText.set(text, event.timestamp)
    out.push(event)
  }

  return out
}

interface Conversation {
  id: string | null
  live: AgentSessionEvent[]
  streaming: StreamingMessage | null
  error: string | null
  subscribed: boolean
}

const emptyConversation = (id: string | null): Conversation => ({
  id,
  live: [],
  streaming: null,
  error: null,
  subscribed: false,
})

export function useChat(sessionId: string | null): ChatState & {
  send: (text: string) => Promise<void>
  stop: () => Promise<void>
  answerConfirmation: (confirmationId: string, value: boolean) => Promise<void>
  answerQuestion: (questionId: string, answers: Record<string, string>) => Promise<void>
} {
  const qc = useQueryClient()
  /** When a message was last sent from here — turns the poll on. */
  const sentAt = useRef<number | null>(null)

  /**
   * The persisted chat. Read once while idle; polled while a run might be in
   * flight, because the socket is not a guarantee — a dropped connection ends
   * with the final message persisted and nothing reaching this client.
   */
  const persisted = useQuery({
    queryKey: chatQueryKey(sessionId),
    queryFn: () => getSession(sessionId as string),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? null
      const fresh = Date.now() - (status?.updatedAtTimestamp ?? 0) < STATUS_GOES_STALE_AFTER_MS
      const justSent = sentAt.current != null && Date.now() - sentAt.current < RUN_GRACE_MS
      return (isBusyStatus(status) && fresh) || justSent ? RUN_POLL_MS : false
    },
    refetchIntervalInBackground: true,
  })

  const [conversation, setConversation] = useState<Conversation>(() => emptyConversation(sessionId))
  if (conversation.id !== sessionId) setConversation(emptyConversation(sessionId))

  const { live, streaming } = conversation

  useEffect(() => {
    if (!sessionId) return

    const off = subscribeToChat(
      sessionId,
      (event) => {
        setConversation((prev) => {
          if (prev.id !== event.agentSessionId) return prev

          if (event.type === 'message-stream' && event.messageStream) {
            const { messageStreamId, text } = event.messageStream
            const streamingNow =
              prev.streaming?.messageStreamId === messageStreamId
                ? { messageStreamId, text: prev.streaming.text + text }
                : { messageStreamId, text }
            return { ...prev, streaming: streamingNow }
          }

          // Any final agent message closes the open stream.
          const closesStream = event.type === 'message' && event.actor === 'agent'

          if (prev.live.some((e) => e.id === event.id)) {
            return closesStream ? { ...prev, streaming: null } : prev
          }

          return {
            ...prev,
            live: [...prev.live, event],
            streaming: closesStream ? null : prev.streaming,
          }
        })
      },
      () => setConversation((prev) => (prev.id === sessionId ? { ...prev, subscribed: true } : prev)),
    )

    const offSystem = onSystemMessage((message: SystemMessage) => {
      setConversation((prev) => ({
        ...prev,
        error: message.error?.text ?? 'The assistant reported an error',
      }))
    })

    return () => {
      off()
      offSystem()
    }
  }, [sessionId])

  // A socket that has just (re)connected may have missed a whole turn.
  useEffect(() => {
    if (!sessionId) return
    return onSocketConnect(() => {
      void qc.invalidateQueries({ queryKey: chatQueryKey(sessionId) })
    })
  }, [sessionId, qc])

  const session = persisted.data?.id === sessionId ? persisted.data : undefined
  const fetchedAt = persisted.dataUpdatedAt

  const state = useMemo<ChatState>(() => {
    const all = [...(session?.events ?? []), ...live]
    const seen = new Set<string>()
    const liveIds = new Set(live.map((event) => event.id))
    const ordered = dedupeMessages(
      all
        .filter((event) => (seen.has(event.id) ? false : (seen.add(event.id), true)))
        .sort((a, b) => a.timestamp - b.timestamp),
      liveIds,
    )

    const messages: AgentSessionEvent[] = []
    const steps = new Map<string, ProcessingStep>()
    const thoughts = new Map<string, { id: string; text: string }>()
    let plan: { text: string; done: boolean }[] = session?.plan?.items ?? []
    let status: AgentSessionStatus | null = session?.status ?? null
    let statusAt = session?.status?.updatedAtTimestamp ?? 0
    let statusIsLive = false
    let confirmation: ConfirmationPayload | null = null
    let question: QuestionPayload | null = null
    let blocked: string | null = null
    let error: string | null = null

    for (const event of ordered) {
      switch (event.type) {
        case 'message':
          messages.push(event)
          if (event.message?.errorCode) error = event.message.text || event.message.errorCode
          break
        case 'processing-step':
          if (event.processingStep) {
            const step = event.processingStep
            steps.set(step.id, {
              id: step.id,
              kind: step.kind,
              label: step.label,
              status: step.status,
              toolName: step.toolName,
              error: step.error,
            })
          }
          break
        case 'thought':
          if (event.thought) thoughts.set(event.thought.id, event.thought)
          break
        case 'plan':
          if (event.plan) plan = event.plan.items
          break
        case 'status':
          if (event.status) {
            const at = event.status.updatedAtTimestamp || event.timestamp
            if (at >= statusAt) {
              status = event.status
              statusAt = at
              statusIsLive = liveIds.has(event.id)
            }
          }
          break
        case 'confirmation':
          if (event.confirmation) confirmation = event.confirmation
          break
        case 'resolved-confirmation':
          confirmation = null
          break
        case 'question':
          if (event.question) question = event.question
          break
        case 'resolved-question':
          question = null
          break
        case 'system-event':
          if (event.systemEvent?.type?.includes('credits-exceeded')) {
            blocked =
              event.systemEvent.type === 'session-credits-exceeded'
                ? 'This chat has used up its AI credits.'
                : 'The demo organization has used up its AI credits for now.'
          }
          break
        default:
          break
      }
    }

    return {
      session,
      events: messages,
      streaming,
      steps: [...steps.values()],
      thoughts: [...thoughts.values()],
      plan,
      status,
      confirmation,
      question,
      blocked,
      error: conversation.error ?? error,
      isPending: Boolean(sessionId) && persisted.isPending,
      isBusy:
        Boolean(streaming) ||
        (isBusyStatus(status) &&
          (statusIsLive || Boolean(statusAt)) &&
          fetchedAt - statusAt < STATUS_GOES_STALE_AFTER_MS),
      isSubscribed: conversation.subscribed,
    }
  }, [
    session,
    sessionId,
    persisted.isPending,
    fetchedAt,
    live,
    streaming,
    conversation.error,
    conversation.subscribed,
  ])

  const send = useCallback(
    async (text: string) => {
      if (!sessionId) return
      setConversation((prev) => ({ ...prev, error: null }))
      sentAt.current = Date.now()

      if (isSocketConnected()) {
        await sendChatMessage(sessionId, text)
        void persisted.refetch()
        return
      }

      // No socket: the blocking HTTP send, with the client's own copy shown
      // at once and the log re-read when the run is over. No streaming.
      setConversation((prev) => ({
        ...prev,
        live: [
          ...prev.live,
          {
            id: randomUuid(),
            agentSessionId: sessionId,
            timestamp: Date.now(),
            type: 'message',
            actor: 'client',
            message: { text },
          },
          {
            id: randomUuid(),
            agentSessionId: sessionId,
            timestamp: Date.now(),
            type: 'status',
            actor: 'agent',
            status: { type: 'processing', text: 'Working (no live connection)', updatedAtTimestamp: Date.now() },
          },
        ],
      }))
      void persisted.refetch()
      try {
        await sendMessageHttp(sessionId, text)
      } finally {
        sentAt.current = null
        await persisted.refetch()
      }
    },
    [sessionId, persisted],
  )

  const stop = useCallback(async () => {
    if (!sessionId) return
    await stopChatRun(sessionId)
  }, [sessionId])

  const answerConfirmation = useCallback(
    async (confirmationId: string, value: boolean) => {
      if (!sessionId) return
      await resolveConfirmation(sessionId, confirmationId, value)
      setConversation((prev) => ({
        ...prev,
        live: [
          ...prev.live,
          {
            id: randomUuid(),
            agentSessionId: sessionId,
            timestamp: Date.now(),
            type: 'resolved-confirmation',
            actor: 'client',
          },
        ],
      }))
    },
    [sessionId],
  )

  const answerQuestion = useCallback(
    async (questionId: string, answers: Record<string, string>) => {
      if (!sessionId) return
      await resolveQuestion(sessionId, questionId, answers)
      setConversation((prev) => ({
        ...prev,
        live: [
          ...prev.live,
          {
            id: randomUuid(),
            agentSessionId: sessionId,
            timestamp: Date.now(),
            type: 'resolved-question',
            actor: 'client',
          },
        ],
      }))
    },
    [sessionId],
  )

  return { ...state, send, stop, answerConfirmation, answerQuestion }
}
