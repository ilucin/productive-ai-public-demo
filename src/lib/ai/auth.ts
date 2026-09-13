/** ---------------------------------------------------------------
 *  Who the demo is, and the token the assistant accepts.
 *
 *  The assistant (ai-agent) authenticates with a **JWT minted by the
 *  Productive API**, not with the PAT. Minting needs the person and user
 *  ids behind the PAT, which come from the organization membership. Both
 *  shapes below were verified against the live API on 2026-09-13:
 *
 *  - `GET /api/v2/organization_memberships?filter[organization_id]=…&include=person,user`
 *    → JSON:API; `data[0].relationships.person.data.id`, `…user.data.id`,
 *    email on the included `users` record.
 *  - `POST /api/v2/sessions/jwt` with the fields **top-level** (not wrapped
 *    in `data`) → 201, plain JSON `{ jwt, payload: { exp, … } }`.
 *    `person_id` is what ai-agent actually checks — without it every route
 *    answers 401.
 *  --------------------------------------------------------------- */

import { API_HOST, DEMO_PAT, ORGANIZATION_ID, STORAGE_KEYS } from '@/lib/config'
import { readJson, remove, writeJson } from '@/lib/storage'

export interface Identity {
  personId: string
  userId: string
  email: string
  organizationId: string
}

interface JsonApiResource {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: { id: string; type: string } | null }>
}

interface MembershipsResponse {
  data: JsonApiResource[]
  included?: JsonApiResource[]
}

const API_HEADERS = {
  'X-Auth-Token': DEMO_PAT,
  'X-Organization-Id': ORGANIZATION_ID,
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
}

export class AuthError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

async function fetchIdentity(): Promise<Identity> {
  const params = new URLSearchParams({
    'filter[organization_id]': ORGANIZATION_ID,
    include: 'person,user',
  })
  const response = await fetch(`${API_HOST}/api/v2/organization_memberships?${params}`, {
    headers: API_HEADERS,
  })
  if (!response.ok) {
    throw new AuthError(response.status, `Could not read the demo membership (${response.status})`)
  }

  const doc = (await response.json()) as MembershipsResponse
  const membership = doc.data[0]
  const personId = membership?.relationships?.person?.data?.id
  const userId = membership?.relationships?.user?.data?.id
  if (!membership || !personId || !userId) {
    throw new AuthError(404, `No membership in organization ${ORGANIZATION_ID} for the demo token`)
  }

  const user = doc.included?.find((r) => r.type === 'users' && r.id === userId)
  const email = typeof user?.attributes?.email === 'string' ? user.attributes.email : null
  if (!email) throw new AuthError(404, 'The demo user has no email on record')

  return { personId, userId, email, organizationId: ORGANIZATION_ID }
}

let identityInFlight: Promise<Identity> | null = null

/** The demo identity, read once and remembered in localStorage. */
export function getIdentity(): Promise<Identity> {
  const cached = readJson<Identity>(STORAGE_KEYS.identity)
  if (cached?.personId && cached.userId && cached.email && cached.organizationId === ORGANIZATION_ID) {
    return Promise.resolve(cached)
  }
  if (identityInFlight) return identityInFlight

  identityInFlight = fetchIdentity()
    .then((identity) => {
      writeJson(STORAGE_KEYS.identity, identity)
      return identity
    })
    .finally(() => {
      identityInFlight = null
    })
  return identityInFlight
}

/* -------------------------------------------------------------- */
/*  JWT                                                            */
/* -------------------------------------------------------------- */

interface CachedJwt {
  token: string
  /** Unix ms — from the token's own `exp`, not from what was asked for. */
  expiresAt: number
}

const JWT_LIFETIME_SECONDS = 1800
/** Refreshed this far ahead of expiry so a long chat never trips over it. */
const JWT_REFRESH_MARGIN_MS = 10 * 60 * 1000

let jwtCache: CachedJwt | null = readJson<CachedJwt>(STORAGE_KEYS.jwt)
let jwtInFlight: Promise<string> | null = null

async function mint(identity: Identity): Promise<string> {
  const response = await fetch(`${API_HOST}/api/v2/sessions/jwt`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({
      expires_in: JWT_LIFETIME_SECONDS,
      type: 'write',
      organization_id: identity.organizationId,
      user_email: identity.email,
      person_id: identity.personId,
      user_id: identity.userId,
    }),
  })
  if (!response.ok) {
    throw new AuthError(response.status, `Could not mint the assistant token (${response.status})`)
  }

  const doc = (await response.json()) as { jwt?: string; payload?: { exp?: number } }
  if (!doc.jwt) throw new AuthError(502, 'The API returned no JWT')

  jwtCache = {
    token: doc.jwt,
    expiresAt: doc.payload?.exp ? doc.payload.exp * 1000 : Date.now() + JWT_LIFETIME_SECONDS * 1000,
  }
  writeJson(STORAGE_KEYS.jwt, jwtCache)
  return doc.jwt
}

/**
 * A JWT for the assistant, minted on demand and reused until it is close to
 * expiring. Concurrent callers share one mint.
 */
export async function getJwt(): Promise<string> {
  const current = jwtCache
  if (current && current.expiresAt - Date.now() > JWT_REFRESH_MARGIN_MS) return current.token
  if (jwtInFlight) return jwtInFlight

  jwtInFlight = getIdentity()
    .then(mint)
    .finally(() => {
      jwtInFlight = null
    })
  return jwtInFlight
}

/** Forces a fresh mint on the next call — after a 401, for instance. */
export function clearJwt(): void {
  jwtCache = null
  remove(STORAGE_KEYS.jwt)
}

/* -------------------------------------------------------------- */
/*  The cosmetic login                                             */
/* -------------------------------------------------------------- */

export function isSignedIn(): boolean {
  return readJson<boolean>(STORAGE_KEYS.signedIn) === true
}

export function rememberSignedIn(): void {
  writeJson(STORAGE_KEYS.signedIn, true)
}

export function signOut(): void {
  remove(STORAGE_KEYS.signedIn)
  remove(STORAGE_KEYS.identity)
  clearJwt()
}
