/** ---------------------------------------------------------------
 *  Everything this demo is hardwired to.
 *
 *  This is a public conference demo: every visitor shares one Productive
 *  "Visitor" user in one demo organization. The credentials below are
 *  deliberately in the source — the repo is public and the org has an AI
 *  credit cap, so the exposure is accepted. Nothing here is a secret worth
 *  protecting; nothing here should be copied to a real app.
 *  --------------------------------------------------------------- */

/** The assistant's backend (Socket.io + REST). */
export const AI_AGENT_HOST = 'https://ai-agent-latest.productive.io'

/** The Productive v2 API — used only to resolve the identity and mint the JWT. */
export const API_HOST = 'https://api.productive.io'

/** The demo workspace. */
export const ORGANIZATION_ID = '61715'

/** The cosmetic login: validated locally, never sent anywhere. */
export const DEMO_LOGIN = {
  email: 'ivan.lucin+shiftpublicaccount@productive.io',
  password: 'ShiftVisitor',
} as const

/** The Visitor user's personal access token, used for the JWT mint. */
export const DEMO_PAT = 'ea4acece-79b1-45de-a45e-528846dff253'

/**
 * Sent as `config` on `POST /agent-sessions`. Field names follow
 * `AgentConfigSchema` in ai-agent (`src/agent/events.ts`); the model id must
 * be in `GET /agent-sessions/config` → `availableModels` (it is).
 */
export const AGENT_CONFIG = {
  model: 'gpt-5.6-terra',
  reasoningEffort: 'low',
} as const

/** `clientType` the agent expects from a chat UI. */
export const CLIENT_TYPE = 'app-agent-chat'

/** localStorage keys, in one place so a reset can clear them all. */
export const STORAGE_KEYS = {
  signedIn: 'shift-demo.signed-in',
  identity: 'shift-demo.identity',
  jwt: 'shift-demo.jwt',
  currentSession: 'shift-demo.current-session',
} as const

/**
 * The demo identity behind the PAT, resolved once via
 * `GET /organization_memberships` (see `scripts/mint-jwt.mjs`). Kept here so
 * the app does not depend on that call at runtime.
 */
export const DEMO_IDENTITY = {
  personId: '1445022',
  userId: '301518',
  email: 'ivan.lucin+shiftpublicaccount@productive.io',
  organizationId: ORGANIZATION_ID,
} as const

/**
 * A pre-minted assistant JWT for the demo user.
 *
 * Needed because `api.productive.io` only allows CORS from *.productive.io
 * and localhost, so the static app on GitHub Pages cannot mint a token
 * itself (it can on localhost, and does, as the fallback). Minted with a
 * 7-day lifetime by `node scripts/mint-jwt.mjs`; the app reads the real
 * expiry from the token and falls back to a live mint once it is stale.
 * Derived from the PAT above, so it exposes nothing the repo does not
 * already expose.
 *
 * Minted 2026-09-13, expires 2026-09-20T11:48:03Z. Re-run the script and
 * paste the output here to refresh.
 */
export const DEMO_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozMDE1MTgsImV4cCI6MTc4OTkwNDg4MywidHlwZSI6IndyaXRlIiwicGVyc29uX2lkIjoiMTQ0NTAyMiIsIm9yZ2FuaXphdGlvbl9pZCI6IjYxNzE1IiwidXNlcl9lbWFpbCI6Iml2YW4ubHVjaW4rc2hpZnRwdWJsaWNhY2NvdW50QHByb2R1Y3RpdmUuaW8ifQ.Sdp3SnSEXfT6iqCsxIzOlE1RmcDKZI1MdgJEPHKoJpI'
