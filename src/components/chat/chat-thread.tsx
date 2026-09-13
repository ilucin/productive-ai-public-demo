import { useEffect, useRef } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import type { AgentSessionEvent } from '@/lib/ai/client'
import type { ChatState } from '@/hooks/use-chat'
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'

/**
 * A chat's transcript: messages and the reply being written.
 *
 * Minimal on purpose — steps, plan, confirmation and question cards are the
 * next step (they are already in `ChatState`; see fantastic's
 * `components/chat/chat-thread.tsx` for the reference rendering).
 */
export function ChatThread({ chat }: { chat: ChatState }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { events, streaming, status, steps } = chat

  // Follow the reply as it is written; land on the newest message on open.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [events.length, streaming?.text, steps.length, chat.isBusy])

  const runningStep = steps.filter((step) => step.status === 'running').at(-1)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      {events.map((event) => (
        <Message key={event.id} event={event} />
      ))}

      {streaming && (
        <AgentBubble>
          <Markdown source={streaming.text} />
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-[1px] bg-fg-muted" />
        </AgentBubble>
      )}

      {chat.isBusy && !streaming && (
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="min-w-0 truncate">{runningStep?.label || status?.text || 'Working…'}</span>
        </div>
      )}

      {chat.blocked && (
        <Notice tone="warning">{chat.blocked}</Notice>
      )}

      {chat.error && <Notice tone="danger">{chat.error}</Notice>}

      <div ref={bottomRef} />
    </div>
  )
}

function Message({ event }: { event: AgentSessionEvent }) {
  const text = event.message?.text ?? ''
  if (!text) return null

  if (event.actor === 'client') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-accent-fg">
          {text}
        </div>
      </div>
    )
  }

  return (
    <AgentBubble error={Boolean(event.message?.errorCode)}>
      <Markdown source={text} />
    </AgentBubble>
  )
}

function AgentBubble({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 text-sm text-fg',
        error && 'border-l-2 border-danger-subtle pl-3 text-danger',
      )}
    >
      {children}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'danger' | 'warning'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        tone === 'danger'
          ? 'border-danger-subtle bg-danger-subtle text-danger'
          : 'border-warning-subtle bg-warning-subtle text-fg',
      )}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}
