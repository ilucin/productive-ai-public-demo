import { Bot, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Placeholder shell. Later steps replace the body with the login screen and
 * the chat; the frame (full-height column, safe-area padding, tokens) stays.
 */
export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 pt-[env(safe-area-inset-top)]">
        <span className="flex size-6 items-center justify-center rounded-[0.3rem] bg-accent-subtle text-accent">
          <Bot className="size-4" strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold tracking-[-0.01em]">Productive AI</span>
        <span className="ml-auto rounded-full border border-border bg-bg-sunken px-2 py-px text-2xs font-medium text-fg-muted">
          Shift 2026
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[env(safe-area-inset-bottom)] text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
          <Sparkles className="size-7" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Productive AI — Shift 2026 demo
          </h1>
          <p className="max-w-sm text-sm text-fg-muted">
            A public chat with the Productive AI agent harness. Ask it how it works, or anything
            about Shift. Coming online shortly.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={() => toast('The chat is being wired up. Check back soon.')}>
            <Sparkles />
            Start chatting
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <a href="https://productive.io" target="_blank" rel="noreferrer">
              About Productive
            </a>
          </Button>
        </div>
      </main>

      <footer className="shrink-0 px-4 py-3 text-center text-2xs text-fg-subtle">
        Built with the same stack as Productive's own client. Deployed from GitHub Pages.
      </footer>
    </div>
  )
}
