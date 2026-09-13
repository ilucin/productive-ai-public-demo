import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The message box. Enter sends, Shift+Enter breaks the line; the field grows
 * with its content, then scrolls. One turn at a time: while the agent is
 * working the field is locked and the button turns into Stop.
 */
export function Composer({
  onSend,
  onStop,
  busy = false,
  sending = false,
  disabled = false,
  placeholder = 'Ask anything…',
  autoFocus = false,
}: {
  onSend: (text: string) => void
  onStop?: () => void
  busy?: boolean
  sending?: boolean
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const node = inputRef.current
    if (!node) return
    node.style.height = '0px'
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`
  }, [draft])

  const canSend = draft.trim().length > 0 && !busy && !sending && !disabled

  const submit = () => {
    if (!canSend) return
    const text = draft.trim()
    setDraft('')
    onSend(text)
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-bg-elevated p-2 shadow-[var(--shadow-card)] transition-colors focus-within:border-border-strong',
        disabled && 'opacity-60',
      )}
    >
      <textarea
        ref={inputRef}
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          submit()
        }}
        rows={1}
        disabled={disabled || busy}
        placeholder={placeholder}
        aria-label="Message"
        // 16px on phones: anything smaller makes iOS Safari zoom in on focus.
        className="block max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5 text-base text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed md:text-sm"
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="px-2 text-2xs text-fg-subtle">Enter to send · Shift+Enter for a new line</span>

        {busy && onStop ? (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onStop}
            aria-label="Stop generating"
            className="rounded-full"
          >
            <Square />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className="rounded-full"
          >
            {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        )}
      </div>
    </div>
  )
}
