import { useEffect, useState } from 'react'
import { Bot, Code2, ExternalLink, Menu, MoreHorizontal, SquarePen, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Hint } from '@/components/ui/tooltip'
import { ChatList } from '@/components/chat/chat-list'
import { ChatScroll } from '@/components/chat/chat-scroll'
import { ChatThread } from '@/components/chat/chat-thread'
import { Composer } from '@/components/chat/composer'
import { EmptyState } from '@/components/chat/empty-state'
import { useChat } from '@/hooks/use-chat'
import { getJwt } from '@/lib/ai/auth'
import { createSession, deleteSession } from '@/lib/ai/client'
import { onConnectionChange, onSystemMessage, type ConnectionState } from '@/lib/ai/socket'
import {
  UNTITLED,
  addChat,
  removeChat,
  renameChat,
  setCurrentChat,
  titleFrom,
  touchChat,
  useChatList,
  type ChatSummary,
} from '@/lib/chats'
import { LINKS } from '@/lib/config'
import { cn } from '@/lib/utils'

/**
 * The whole app: a chat list (column on a desktop, drawer on a phone), the
 * current chat, and the composer. No sign-in — the demo user is hardwired
 * (`lib/config.ts`) and the page opens straight into a chat.
 */
export default function App() {
  const { chats, currentId: sessionId } = useChatList()
  const [creating, setCreating] = useState(false)
  /** The first message of a new chat, held until the room is joined. */
  const [pending, setPending] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>({ status: 'connecting' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const chat = useChat(sessionId)
  const current = chats.find((c) => c.id === sessionId)

  // Warm the token so the first send does not pay for a mint.
  useEffect(() => {
    void getJwt().catch(() => undefined)
  }, [])

  useEffect(() => onConnectionChange(setConnection), [])

  // Server-side complaints about what we sent (schema, auth) are transient.
  useEffect(
    () =>
      onSystemMessage((message) => {
        toast.error(message.error?.text ?? 'The assistant reported an error', {
          description: message.error?.code,
        })
      }),
    [],
  )

  // A message sent before the room is joined would run the agent while
  // nobody is listening, so a new chat's first message waits for `isSubscribed`.
  useEffect(() => {
    if (!pending || !sessionId || !chat.isSubscribed) return
    const text = pending
    setPending(null)
    chat.send(text).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not send the message')
    })
  }, [pending, sessionId, chat.isSubscribed, chat])

  // The server titles a chat from its first exchange; take that over ours
  // once it is there, unless we already have a real one.
  useEffect(() => {
    const title = chat.session?.title?.trim()
    if (!sessionId || !title || !current) return
    if (current.title === UNTITLED || current.title === 'Earlier chat') renameChat(sessionId, title)
  }, [sessionId, chat.session?.title, current])

  const startNewChat = () => {
    setCurrentChat(null)
    setPending(null)
    setDrawerOpen(false)
  }

  const openChat = (id: string) => {
    setCurrentChat(id)
    setPending(null)
    setDrawerOpen(false)
  }

  const deleteChat = (target: ChatSummary) => {
    removeChat(target.id)
    // Local is what matters; the server copy is tidied up if it lets us.
    void deleteSession(target.id).catch(() => undefined)
    toast('Chat deleted', { description: target.title })
  }

  const handleSend = async (text: string) => {
    if (sessionId) {
      try {
        await chat.send(text)
        touchChat(sessionId)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not send the message')
      }
      return
    }

    setCreating(true)
    try {
      const title = titleFrom(text)
      const session = await createSession({ title })
      addChat(session.id, title)
      setPending(text)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start a chat')
    } finally {
      setCreating(false)
    }
  }

  const empty =
    !sessionId ||
    (!chat.isPending && chat.events.length === 0 && !chat.streaming && chat.steps.length === 0 && !pending)
  const offline = connection.status === 'disconnected' || connection.status === 'error'
  const busy = chat.isBusy || Boolean(pending) || creating

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-fg">
      {/* Desktop: the chat list is a column. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-subtle md:flex">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <Brand />
        </div>
        <ChatList onOpen={openChat} onNew={startNewChat} onDelete={deleteChat} />
      </aside>

      {/* Phone: the same list slides in from the left. */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          bare
          hideClose
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 flex w-[min(85vw,20rem)] flex-col border-r bg-bg-subtle',
            'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left duration-200',
          )}
        >
          <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
            <DialogTitle asChild>
              <span className="min-w-0 flex-1">
                <Brand />
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Your chats on this device</DialogDescription>
          </div>
          <ChatList onOpen={openChat} onNew={startNewChat} onDelete={deleteChat} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2 pt-[env(safe-area-inset-top)] md:px-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Your chats"
          >
            <Menu />
          </Button>

          <div className="min-w-0 flex-1 px-1 md:hidden">
            <Brand />
          </div>
          <div className="hidden min-w-0 flex-1 items-center gap-2 px-1 md:flex">
            <span className="truncate text-sm font-medium">{current?.title ?? 'New chat'}</span>
          </div>

          {offline && (
            <Hint label={connection.status === 'error' ? connection.message : 'Reconnecting…'}>
              <span className="flex items-center gap-1 rounded-full border border-warning-subtle bg-warning-subtle px-2 py-px text-2xs text-fg-muted">
                <WifiOff className="size-3" />
                <span className="max-sm:hidden">Offline</span>
              </span>
            </Hint>
          )}

          <Hint label="New chat">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={startNewChat}
              disabled={!sessionId}
              aria-label="New chat"
            >
              <SquarePen />
            </Button>
          </Hint>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={LINKS.productive} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  productive.io
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={LINKS.repo} target="_blank" rel="noreferrer">
                  <Code2 />
                  Source on GitHub
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Connect with Ivan on LinkedIn
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-normal normal-case tracking-normal text-fg-subtle">
                Shared demo account · limited AI credits
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <ChatScroll key={sessionId ?? 'new'} follow={!empty}>
          {empty ? (
            <EmptyState onPrompt={(text) => void handleSend(text)} disabled={busy} />
          ) : (
            <ChatThread
              chat={chat}
              onAnswerConfirmation={async (id, value) => {
                try {
                  await chat.answerConfirmation(id, value)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Could not send the answer')
                }
              }}
              onAnswerQuestion={async (id, answers) => {
                try {
                  await chat.answerQuestion(id, answers)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Could not send the answer')
                }
              }}
            />
          )}
        </ChatScroll>

        <div className="shrink-0 border-t border-border bg-bg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            {chat.blocked && (
              <div className="flex items-start gap-2 rounded-xl border border-warning-subtle bg-warning-subtle px-3.5 py-2.5 text-sm text-fg">
                <Bot className="mt-0.5 size-4 shrink-0 text-fg-muted" />
                <span>
                  The demo account ran out of AI credits — thanks for trying it! Read more about the
                  harness at{' '}
                  <a href={LINKS.productive} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    productive.io
                  </a>
                  .
                </span>
              </div>
            )}

            {offline && !chat.blocked && (
              <div className="flex items-center gap-2 text-2xs text-fg-muted">
                <WifiOff className="size-3 shrink-0" />
                <span>No live connection — messages still go through, but replies will not stream.</span>
              </div>
            )}

            <Composer
              onSend={(text) => void handleSend(text)}
              onStop={() => void chat.stop()}
              busy={chat.isBusy || Boolean(pending)}
              sending={creating}
              disabled={Boolean(chat.blocked)}
              placeholder={
                chat.blocked
                  ? 'Out of credits for this demo'
                  : chat.isBusy
                    ? 'Working… press stop to interrupt'
                    : 'Ask about Shift 2026 or the agent harness…'
              }
              autoFocus
            />
            <p className="px-2 text-center text-2xs text-fg-subtle">
              Shared demo account · limited AI credits
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[0.3rem] bg-accent text-accent-fg">
        <Bot className="size-4" strokeWidth={2} />
      </span>
      <span className="truncate text-sm font-semibold tracking-[-0.01em]">
        <span className="hidden sm:inline">Productive </span>AI
      </span>
      <span className="shrink-0 text-fg-subtle">×</span>
      <span className="shrink-0 rounded-full border border-border bg-bg-sunken px-2 py-px text-2xs font-medium text-fg-muted">
        Shift 2026
      </span>
    </span>
  )
}
