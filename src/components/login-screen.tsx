import { useState, type FormEvent } from 'react'
import { Bot, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEMO_LOGIN } from '@/lib/config'

/**
 * A cosmetic gate. The fields come pre-filled so the audience only taps
 * "Sign in"; the values are checked locally against the demo credentials.
 * No real Productive session is created — the app uses a fixed access
 * token underneath.
 */
export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState<string>(DEMO_LOGIN.email)
  const [password, setPassword] = useState<string>(DEMO_LOGIN.password)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const ok =
      email.trim().toLowerCase() === DEMO_LOGIN.email.toLowerCase() && password === DEMO_LOGIN.password
    if (!ok) {
      setError('Those are not the demo credentials. Use the pre-filled ones.')
      return
    }
    setError(null)
    onSignedIn()
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border bg-bg-elevated p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
            <Bot className="size-6" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Sign in to the demo</h1>
            <p className="text-xs text-fg-muted">
              A shared visitor account in a demo Productive workspace. The credentials are already
              filled in.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
          Email
          <Input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
          Password
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full">
          <LogIn />
          Sign in
        </Button>
      </form>
    </main>
  )
}
