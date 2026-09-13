import { MessageSquare, SquarePen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LINKS } from '@/lib/config'
import { useChatList, type ChatSummary } from '@/lib/chats'
import { cn } from '@/lib/utils'

/**
 * The chats this browser started, newest first. Shared by the desktop column
 * and the phone drawer; the container decides the chrome.
 */
export function ChatList({
  onOpen,
  onNew,
  onDelete,
}: {
  onOpen: (id: string) => void
  onNew: () => void
  onDelete: (chat: ChatSummary) => void
}) {
  const { chats, currentId } = useChatList()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-2 pt-3">
        <Button variant="secondary" size="md" className="w-full justify-start" onClick={onNew}>
          <SquarePen />
          New chat
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Your chats">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-fg-subtle">
            Chats you start on this device show up here. They stay in this browser only.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {chats.map((chat) => {
              const active = chat.id === currentId
              return (
                <li key={chat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(chat.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex w-full min-w-0 items-center gap-2 rounded-lg py-2 pl-2.5 pr-10 text-left text-sm transition-colors max-md:min-h-11',
                      active ? 'bg-bg-active text-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0 text-fg-subtle" />
                    <span className="min-w-0 flex-1 truncate">{chat.title}</span>
                    <span className="shrink-0 text-2xs text-fg-subtle">{when(chat.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(chat)
                    }}
                    aria-label={`Delete chat: ${chat.title}`}
                    className={cn(
                      'absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-base text-fg-subtle transition-[opacity,background-color,color] max-md:size-9',
                      'hover:bg-danger-subtle hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
                      active && 'md:opacity-100',
                    )}
                  >
                    <Trash2 className="size-3.5 max-md:size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <footer className="flex flex-col gap-1 border-t border-border px-4 py-3 text-2xs text-fg-subtle">
        <span>Public demo · Shift 2026, Zagreb</span>
        <span className="flex gap-3">
          <a href={LINKS.productive} target="_blank" rel="noreferrer" className="hover:text-fg-muted">
            productive.io
          </a>
          <a href={LINKS.repo} target="_blank" rel="noreferrer" className="hover:text-fg-muted">
            GitHub
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-fg-muted">
            LinkedIn
          </a>
        </span>
      </footer>
    </div>
  )
}

/** "14:02" today, "Yesterday", or "3 Sep" — the list is a memory aid, not a log. */
function when(at: number): string {
  const date = new Date(at)
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, now)) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}
