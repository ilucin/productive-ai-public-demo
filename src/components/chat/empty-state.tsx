import { ArrowUpRight, Sparkles } from 'lucide-react'
import { LINKS, SUGGESTED_PROMPTS } from '@/lib/config'

/**
 * What a new chat opens with: who is on the other end, and six things worth
 * asking. Tapping a prompt sends it — one tap from a phone in the audience to
 * the harness doing something visible.
 */
export function EmptyState({ onPrompt, disabled }: { onPrompt: (text: string) => void; disabled?: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 px-4 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
          <Sparkles className="size-7" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Ask the Productive AI agent</h1>
          <p className="max-w-md text-sm text-fg-muted">
            A public demo for Shift 2026. You are talking to Productive's agent harness, running
            against a demo workspace. Ask about the Shift conference, or about how the harness
            itself works — and watch the steps it takes.
          </p>
        </div>
      </div>

      <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPrompt(prompt)}
              className="group flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 text-left text-sm text-fg shadow-[var(--shadow-card)] transition-colors hover:border-border-strong hover:bg-bg-hover active:bg-bg-active disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">{prompt}</span>
              <ArrowUpRight className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-accent" />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-2xs text-fg-subtle">
        Shared demo account with a limited AI credit budget — one question at a time, please.{' '}
        <a href={LINKS.repo} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg-muted">
          Source on GitHub
        </a>
      </p>
    </main>
  )
}
