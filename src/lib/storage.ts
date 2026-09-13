/**
 * localStorage, guarded: private windows and blocked site data can make any
 * access throw, and this app must still render without it.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Nothing to do: the app works without persistence.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Same as above.
  }
}
