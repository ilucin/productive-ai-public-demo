import { useEffect, useState } from 'react'
import { Bot, LogOut, SquarePen, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LoginScreen } from '@/components/login-screen'
import { ChatThread } from '@/components/chat/chat-thread'
import { Composer } from '@/components/chat/composer'
import { useChat } from '@/hooks/use-chat'
import { getIdentity, isSignedIn, rememberSignedIn, signOut } from '@/lib/ai/auth'
import { createSession } from '@/lib/ai/client'
import { closeSocket, onConnectionChange, type ConnectionState } from '@/lib/ai/socket'
import { STORAGE_KEYS } from '@/lib/config'
import { readJson, remove, writeJson } from '@/lib/storage'

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean>(() => isSignedIn())

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <Header
        signedIn={signedIn}
        onSignOut={() => {
          signOut()
          closeSocket()
          setSignedIn(false)
        }}
      />
      {signedIn ? (
        <ChatScreen />
      ) : (
        <LoginScreen
          onSignedIn={() => {
            rememberSignedIn()
            setSignedIn(true)
          }}
        />
      )}
    </div>
  )
}

function Header({ signedIn, onSignOut }: { signedIn: boolean; onSignOut: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 pt-[env(safe-area-inset-top)]">
      <span className="flex size-6 items-center justify-center rounded-[0.3rem] bg-accent-subtle text-accent">
        <Bot className="size-4" strokeWidth={2} />
      </span>
      <span className="text-sm font-semibold tracking-[-0.01em]">Productive AI</span>
      <span className="rounded-full border border-border bg-bg-sunken px-2 py-px text-2xs font-medium text-fg-muted">
        Shift 2026
      </span>
      {signedIn && (
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onSignOut} aria-label="Sign out">
          <LogOut />
        </Button>
      )}
    </header>
  )
}

/** The current chat's id survives a reload. */
function readCurrentSession(): string | null {
  return readJson<string>(STORAGE_KEYS.currentSession)
}

function ChatScreen() {
  const [sessionId, setSessionId] = useState<string | null>(() => readCurrentSession())
  const [creating, setCreating] = useState(false)
  /** The first message of a new chat, held until the room is joined. */
  const [pending, setPending] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>({ status: 'connecting' })

  const chat = useChat(sessionId)

  // Resolve the identity early so the first send does not pay for it.
  useEffect(() => {
    getIdentity().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not resolve the demo identity')
    })
  }, [])

  useEffect(() => onConnectionChange(setConnection), [])

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

  const startNewChat = () => {
    remove(STORAGE_KEYS.currentSession)
    setSessionId(null)
    setPending(null)
  }

  const handleSend = async (text: string) => {
    if (sessionId) {
      try {
        await chat.send(text)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not send the message')
      }
      return
    }

    setCreating(true)
    try {
      const session = await createSession({ title: text.slice(0, 80) })
      writeJson(STORAGE_KEYS.currentSession, session.id)
      setPending(text)
      setSessionId(session.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start a chat')
    } finally {
      setCreating(false)
    }
  }

  const empty = !sessionId || (!chat.isPending && chat.events.length === 0 && !chat.streaming && !pending)
  const offline = connection.status === 'disconnected' || connection.status === 'error'

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty && !pending ? (
          <EmptyState />
        ) : (
          <ChatThread chat={chat} />
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-bg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          {offline && (
            <div className="flex items-center gap-2 text-2xs text-fg-muted">
              <WifiOff className="size-3" />
              <span>
                No live connection to the assistant — messages still go through, but replies will
                not stream.
              </span>
            </div>
          )}
          <div className="flex items-end gap-2">
            {sessionId && (
              <Button
                variant="secondary"
                size="icon"
                onClick={startNewChat}
                aria-label="New chat"
                className="mb-2 shrink-0 rounded-full"
              >
                <SquarePen />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <Composer
                onSend={(text) => void handleSend(text)}
                onStop={() => void chat.stop()}
                busy={chat.isBusy || Boolean(pending)}
                sending={creating}
                disabled={Boolean(chat.blocked)}
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function EmptyState() {
  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
        <Bot className="size-7" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Ask the Productive AI agent</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          This is a live chat with Productive's agent harness, connected to a demo workspace
          prepared for Shift 2026. Ask how the harness works, or anything about the conference.
        </p>
      </div>
    </main>
  )
}
