/** ---------------------------------------------------------------
 *  The chat list — per browser, in localStorage.
 *
 *  Every visitor of this demo is the same Productive user, so the
 *  server's `GET /agent-sessions` would list everyone's chats. It is
 *  never called. What this browser started is remembered here, and only
 *  here; a chat's transcript is still read from the server by id.
 *
 *  A tiny external store: one snapshot object, replaced on every write,
 *  read through `useSyncExternalStore`.
 *  --------------------------------------------------------------- */

import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/lib/config'
import { readJson, remove, writeJson } from '@/lib/storage'

export interface ChatSummary {
  id: string
  title: string
  /** Unix ms. */
  createdAt: number
  updatedAt: number
}

interface Snapshot {
  chats: ChatSummary[]
  currentId: string | null
}

export const UNTITLED = 'New chat'
const TITLE_MAX = 60

/** A chat's title from its first message: one line, cut at a word. */
export function titleFrom(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  if (!line) return UNTITLED
  if (line.length <= TITLE_MAX) return line
  const cut = line.slice(0, TITLE_MAX)
  const space = cut.lastIndexOf(' ')
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

function isSummary(value: unknown): value is ChatSummary {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.title === 'string' && typeof v.createdAt === 'number'
}

function load(): Snapshot {
  const raw = readJson<unknown[]>(STORAGE_KEYS.chats)
  const chats = Array.isArray(raw)
    ? raw.filter(isSummary).map((c) => ({ ...c, updatedAt: c.updatedAt ?? c.createdAt }))
    : []
  let currentId = readJson<string>(STORAGE_KEYS.currentChat)

  // The first version kept one chat under one key. Fold it into the list so
  // a visitor who reloads after the update keeps the conversation they had.
  const legacy = readJson<string>(STORAGE_KEYS.legacyCurrentSession)
  if (legacy) {
    if (!chats.some((c) => c.id === legacy)) {
      const now = Date.now()
      chats.push({ id: legacy, title: 'Earlier chat', createdAt: now, updatedAt: now })
    }
    currentId = currentId ?? legacy
    remove(STORAGE_KEYS.legacyCurrentSession)
    writeJson(STORAGE_KEYS.chats, chats)
    writeJson(STORAGE_KEYS.currentChat, currentId)
  }

  // The sign-in gate is gone; its flag is not worth keeping around.
  remove('shift-demo.signed-in')

  if (currentId && !chats.some((c) => c.id === currentId)) currentId = null
  return { chats: sort(chats), currentId }
}

const sort = (chats: ChatSummary[]) => [...chats].sort((a, b) => b.updatedAt - a.updatedAt)

let snapshot: Snapshot = load()
const listeners = new Set<() => void>()

function commit(next: Snapshot) {
  snapshot = { chats: sort(next.chats), currentId: next.currentId }
  writeJson(STORAGE_KEYS.chats, snapshot.chats)
  if (snapshot.currentId) writeJson(STORAGE_KEYS.currentChat, snapshot.currentId)
  else remove(STORAGE_KEYS.currentChat)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useChatList(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function getCurrentChatId(): string | null {
  return snapshot.currentId
}

export function setCurrentChat(id: string | null): void {
  if (snapshot.currentId === id) return
  commit({ ...snapshot, currentId: id })
}

/** Adds a chat (or refreshes it) and makes it current. */
export function addChat(id: string, title: string): void {
  const now = Date.now()
  const rest = snapshot.chats.filter((c) => c.id !== id)
  commit({ chats: [{ id, title: title || UNTITLED, createdAt: now, updatedAt: now }, ...rest], currentId: id })
}

/** Marks a chat as just used, so it floats to the top. */
export function touchChat(id: string): void {
  const chat = snapshot.chats.find((c) => c.id === id)
  if (!chat) return
  commit({
    ...snapshot,
    chats: snapshot.chats.map((c) => (c.id === id ? { ...c, updatedAt: Date.now() } : c)),
  })
}

/** Sets the title without changing the order — used when the server's title lands. */
export function renameChat(id: string, title: string): void {
  const next = title.trim()
  const chat = snapshot.chats.find((c) => c.id === id)
  if (!chat || !next || chat.title === next) return
  commit({ ...snapshot, chats: snapshot.chats.map((c) => (c.id === id ? { ...c, title: next } : c)) })
}

/** Forgets a chat. Whether the server keeps it is the caller's business. */
export function removeChat(id: string): void {
  commit({
    chats: snapshot.chats.filter((c) => c.id !== id),
    currentId: snapshot.currentId === id ? null : snapshot.currentId,
  })
}

/** Everything this browser remembers — on sign-out. */
export function clearChats(): void {
  commit({ chats: [], currentId: null })
}
