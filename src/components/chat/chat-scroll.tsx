import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** How far from the bottom still counts as "at the bottom". */
const STICK_PX = 48

/**
 * The scrolling column. Follows the content while the reader is at the
 * bottom — a reply being streamed keeps the newest line in view — and stops
 * following the moment they scroll up to re-read, leaving a button to jump
 * back down. Mount it per chat (`key={sessionId}`) so a freshly opened chat
 * lands on its newest message.
 */
export function ChatScroll({ children, className }: { children: ReactNode; className?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)
  const [showJump, setShowJump] = useState(false)

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const node = viewportRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior })
    stuck.current = true
    setShowJump(false)
  }

  // Any growth of the content re-pins the bottom, but only while stuck.
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    scrollToBottom()
    const observer = new ResizeObserver(() => {
      if (stuck.current) scrollToBottom()
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const onScroll = () => {
    const node = viewportRef.current
    if (!node) return
    const gap = node.scrollHeight - node.scrollTop - node.clientHeight
    const atBottom = gap < STICK_PX
    stuck.current = atBottom
    setShowJump(!atBottom)
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className={cn('h-full overflow-y-auto overflow-x-hidden overscroll-contain', className)}
      >
        <div ref={contentRef} className="flex min-h-full flex-col">
          {children}
        </div>
      </div>

      <button
        type="button"
        hidden={!showJump}
        onClick={() => scrollToBottom('smooth')}
        aria-label="Scroll to bottom"
        className={cn(
          'absolute bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full',
          'border border-border bg-bg-elevated text-fg-muted shadow-[var(--shadow-popover)]',
          'transition-colors hover:bg-bg-hover hover:text-fg animate-in fade-in-0 zoom-in-95',
        )}
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  )
}
