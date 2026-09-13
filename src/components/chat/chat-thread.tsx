import { useState } from 'react'
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Loader2,
  Wrench,
  X,
} from 'lucide-react'
import type { AgentSessionEvent, ConfirmationPayload, QuestionPayload } from '@/lib/ai/client'
import type { ChatState, ProcessingStep, Thought } from '@/hooks/use-chat'
import { Markdown } from '@/components/markdown'
import { MessageActions } from '@/components/chat/message-actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A chat's transcript, in the order things happened: messages, and between
 * them the steps the agent took — tool calls, thinking, thoughts — grouped
 * per turn. The group for the turn in progress is open and updates live;
 * finished groups fold to one line so the answers stay readable, and open on
 * a tap for anyone who wants to see how the harness got there.
 *
 * Agent text is Markdown; user text is rendered verbatim.
 */
export function ChatThread({
  chat,
  onAnswerConfirmation,
  onAnswerQuestion,
}: {
  chat: ChatState
  onAnswerConfirmation: (confirmationId: string, value: boolean) => Promise<void>
  onAnswerQuestion: (questionId: string, answers: Record<string, string>) => Promise<void>
}) {
  const { events, streaming, plan, confirmation, question, status } = chat
  const items = timeline(chat)
  const startedAt = events[0]?.timestamp ?? null

  const last = items.at(-1)
  const liveGroup = chat.isBusy && last?.kind === 'group' ? last : null
  const runningStep = chat.steps.filter((step) => step.status === 'running').at(-1)
  const waiting = status?.type === 'waiting-confirmation' || status?.type === 'waiting-question'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      {startedAt && <StartedAt at={startedAt} />}

      {items.map((item) =>
        item.kind === 'message' ? (
          <Message key={item.event.id} event={item.event} />
        ) : (
          <StepGroup key={item.key} steps={item.steps} thoughts={item.thoughts} live={item === liveGroup} />
        ),
      )}

      {plan.length > 0 && chat.isBusy && <Plan items={plan} />}

      {streaming && (
        <AgentBubble>
          <Markdown source={streaming.text} />
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-[1px] bg-fg-muted" />
        </AgentBubble>
      )}

      {confirmation && <ConfirmationCard confirmation={confirmation} onAnswer={onAnswerConfirmation} />}

      {question && <QuestionForm question={question} onAnswer={onAnswerQuestion} />}

      {chat.isBusy && !streaming && (
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="min-w-0 truncate">
            {waiting ? 'Waiting for your answer…' : runningStep?.label || status?.text || 'Working…'}
          </span>
        </div>
      )}

      {chat.error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-subtle bg-danger-subtle px-3 py-2 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{chat.error}</span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- */
/*  Timeline                                                        */
/* -------------------------------------------------------------- */

type Item =
  | { kind: 'message'; at: number; event: AgentSessionEvent }
  | { kind: 'group'; key: string; at: number; steps: ProcessingStep[]; thoughts: Thought[] }

/** Messages and steps in time order, consecutive steps folded into one group. */
function timeline(chat: ChatState): Item[] {
  type Entry =
    | { kind: 'message'; at: number; event: AgentSessionEvent }
    | { kind: 'step'; at: number; step: ProcessingStep }
    | { kind: 'thought'; at: number; thought: Thought }

  const entries: Entry[] = [
    ...chat.events.map((event): Entry => ({ kind: 'message', at: event.timestamp, event })),
    ...chat.steps.map((step): Entry => ({ kind: 'step', at: step.at, step })),
    ...chat.thoughts.map((thought): Entry => ({ kind: 'thought', at: thought.at, thought })),
  ].sort((a, b) => a.at - b.at)

  const items: Item[] = []
  for (const entry of entries) {
    if (entry.kind === 'message') {
      items.push({ kind: 'message', at: entry.at, event: entry.event })
      continue
    }
    const open = items.at(-1)
    const group =
      open?.kind === 'group'
        ? open
        : (items.push({
            kind: 'group',
            key: `group-${entry.kind === 'step' ? entry.step.id : entry.thought.id}`,
            at: entry.at,
            steps: [],
            thoughts: [],
          }),
          items.at(-1) as Extract<Item, { kind: 'group' }>)
    if (entry.kind === 'step') group.steps.push(entry.step)
    else group.thoughts.push(entry.thought)
  }
  return items
}

/* -------------------------------------------------------------- */
/*  Pieces                                                          */
/* -------------------------------------------------------------- */

/** A quiet date line above the first message. */
function StartedAt({ at }: { at: number }) {
  const when = new Date(at)
  const today = new Date()
  const sameDay =
    when.getFullYear() === today.getFullYear() &&
    when.getMonth() === today.getMonth() &&
    when.getDate() === today.getDate()
  const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const label = sameDay
    ? `Today at ${time}`
    : `${when.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at ${time}`

  return (
    <div className="flex items-center gap-3 pb-1">
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-2xs text-fg-subtle">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function Message({ event }: { event: AgentSessionEvent }) {
  const text = event.message?.text ?? ''
  if (!text) return null

  if (event.actor === 'client') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-accent-fg">
          {text}
        </div>
      </div>
    )
  }

  const error = Boolean(event.message?.errorCode)
  return (
    <AgentBubble error={error}>
      <Markdown source={text} />
      {!error && <MessageActions text={text} />}
    </AgentBubble>
  )
}

function AgentBubble({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className={cn('min-w-0 text-sm text-fg', error && 'border-l-2 border-danger-subtle pl-3 text-danger')}>
      {children}
    </div>
  )
}

/**
 * One turn's worth of work. Live: every step, updating in place. Finished:
 * a summary line — "4 steps · 3 tool calls · 12s" — that opens on a tap.
 */
function StepGroup({ steps, thoughts, live }: { steps: ProcessingStep[]; thoughts: Thought[]; live: boolean }) {
  const [open, setOpen] = useState(false)
  const expanded = live || open

  // Every step is a tool call (`kind` only says whether the tool writes).
  const tools = steps.filter((step) => step.toolName)
  const writes = steps.filter((step) => step.kind === 'action')
  const failed = steps.some((step) => step.status === 'error')
  const first = Math.min(...steps.map((s) => s.at), ...thoughts.map((t) => t.at))
  const lastEnd = Math.max(...steps.map((s) => s.endedAt ?? s.at), ...thoughts.map((t) => t.at))
  const seconds = Number.isFinite(first) && Number.isFinite(lastEnd) ? Math.round((lastEnd - first) / 1000) : 0

  const summary = [
    tools.length > 0
      ? `${tools.length} tool ${tools.length === 1 ? 'call' : 'calls'}`
      : `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`,
    writes.length > 0 && `${writes.length} ${writes.length === 1 ? 'write' : 'writes'}`,
    thoughts.length > 0 && `${thoughts.length} ${thoughts.length === 1 ? 'thought' : 'thoughts'}`,
    seconds > 0 && `${seconds}s`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-bg-subtle px-3 py-2">
      <button
        type="button"
        onClick={() => !live && setOpen((v) => !v)}
        disabled={live}
        aria-expanded={expanded}
        className="flex min-h-6 w-full items-center gap-2 text-left text-2xs font-medium uppercase tracking-wide text-fg-subtle disabled:cursor-default"
      >
        {live ? (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        ) : expanded ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate normal-case tracking-normal">
          {live ? `Working… · ${summary}` : summary}
        </span>
        {failed && !live && <CircleAlert className="size-3 shrink-0 text-danger" />}
      </button>

      {expanded && (
        <ol className="flex flex-col gap-1 pb-0.5">
          {merge(steps, thoughts).map((row) =>
            row.kind === 'step' ? (
              <StepRow key={row.step.id} step={row.step} />
            ) : (
              <li key={row.thought.id} className="flex items-start gap-2 text-xs text-fg-subtle">
                <Brain className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-4 min-w-0 break-words italic">{plain(row.thought.text)}</span>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  )
}

/** A thought is shown as a murmur, not a document: emphasis markers go. */
const plain = (text: string) => text.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim()

function merge(steps: ProcessingStep[], thoughts: Thought[]) {
  return [
    ...steps.map((step) => ({ kind: 'step' as const, at: step.at, step })),
    ...thoughts.map((thought) => ({ kind: 'thought' as const, at: thought.at, thought })),
  ].sort((a, b) => a.at - b.at)
}

function StepRow({ step }: { step: ProcessingStep }) {
  // Sub-second steps say nothing useful with a number next to them.
  const took =
    step.endedAt && step.endedAt - step.at >= 1000 ? `${((step.endedAt - step.at) / 1000).toFixed(1)}s` : null
  return (
    <li className="flex items-start gap-2 text-xs">
      {step.status === 'running' ? (
        <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin text-accent" />
      ) : step.status === 'error' ? (
        <CircleAlert className="mt-0.5 size-3 shrink-0 text-danger" />
      ) : (
        <Check className="mt-0.5 size-3 shrink-0 text-success" />
      )}
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('min-w-0 break-words', step.status === 'error' ? 'text-danger' : 'text-fg-muted')}>
          {step.label}
        </span>
        {step.toolName && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-[0.3rem] border px-1.5 py-px font-mono text-[0.6875rem] leading-4',
              step.kind === 'action'
                ? 'border-accent/30 bg-accent-subtle text-accent'
                : 'border-border bg-bg-elevated text-fg-subtle',
            )}
            title={step.kind === 'action' ? 'A tool that changes data' : 'A read-only tool'}
          >
            <Wrench className="size-2.5" />
            {step.toolName}
          </span>
        )}
        {took && <span className="text-2xs text-fg-subtle">{took}</span>}
        {step.error && <span className="w-full break-words text-2xs text-danger">{step.error}</span>}
      </span>
    </li>
  )
}

/** The agent's live checklist. */
function Plan({ items }: { items: { text: string; done: boolean }[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-2.5">
      <p className="pb-1.5 text-2xs font-medium uppercase tracking-wide text-fg-subtle">Plan</p>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={`${index}-${item.text}`} className="flex items-start gap-2 text-xs">
            {item.done ? (
              <Check className="mt-0.5 size-3 shrink-0 text-success" />
            ) : (
              <ChevronRight className="mt-0.5 size-3 shrink-0 text-fg-subtle" />
            )}
            <span className={cn('min-w-0 break-words', item.done ? 'text-fg-subtle line-through' : 'text-fg-muted')}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The agent wants a go-ahead before it acts. */
function ConfirmationCard({
  confirmation,
  onAnswer,
}: {
  confirmation: ConfirmationPayload
  onAnswer: (confirmationId: string, value: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState<boolean | null>(null)

  const answer = (value: boolean) => {
    setBusy(value)
    void onAnswer(confirmation.id, value).finally(() => setBusy(null))
  }

  return (
    <div className="rounded-xl border border-warning-subtle bg-warning-subtle/60 p-3.5">
      <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">Needs your approval</p>
      <p className="pt-1 text-sm text-fg">{confirmation.text}</p>
      {confirmation.interruptions?.map((interruption) => (
        <p key={interruption.item.id} className="pt-1 text-xs text-fg-muted">
          {interruption.type}: <span className="font-mono text-fg">{interruption.item.name}</span>
        </p>
      ))}
      <div className="flex flex-wrap gap-2 pt-3">
        <Button size="sm" disabled={busy != null} onClick={() => answer(true)}>
          {busy === true ? <Loader2 className="animate-spin" /> : <Check />}
          Approve
        </Button>
        <Button variant="secondary" size="sm" disabled={busy != null} onClick={() => answer(false)}>
          {busy === false ? <Loader2 className="animate-spin" /> : <X />}
          Reject
        </Button>
      </div>
    </div>
  )
}

/**
 * A clarifying question. The agent waits with no timeout, so this is hard to
 * miss and one tap per question to answer. Questions without options get a
 * text field.
 */
function QuestionForm({
  question,
  onAnswer,
}: {
  question: QuestionPayload
  onAnswer: (questionId: string, answers: Record<string, string>) => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const complete = question.questions.every((item) => answers[item.question]?.trim())

  const submit = () => {
    setSending(true)
    void onAnswer(question.id, answers).finally(() => setSending(false))
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-subtle/40 p-3.5">
      <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">The agent has a question</p>
      <div className="flex flex-col gap-3 pt-1">
        {question.questions.map((item) => (
          <div key={item.question} className="flex flex-col gap-1.5">
            <p className="text-sm text-fg">{item.question}</p>
            {item.options && item.options.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.options.map((option) => {
                  const chosen = answers[item.question] === option.label
                  return (
                    <button
                      key={option.label}
                      type="button"
                      title={option.description}
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.question]: option.label }))}
                      className={cn(
                        'min-h-8 rounded-full border px-3 py-1.5 text-xs transition-colors',
                        chosen
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-border bg-bg-elevated text-fg-muted hover:border-border-strong hover:text-fg',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <input
                type="text"
                value={answers[item.question] ?? ''}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [item.question]: event.target.value }))}
                placeholder="Type your answer"
                className="h-9 w-full rounded-lg border border-border bg-bg-elevated px-3 text-base text-fg outline-none placeholder:text-fg-subtle focus-visible:border-border-strong md:text-sm"
              />
            )}
          </div>
        ))}

        <Button size="sm" className="w-fit" disabled={!complete || sending} onClick={submit}>
          {sending && <Loader2 className="animate-spin" />}
          Send answer
        </Button>
      </div>
    </div>
  )
}
