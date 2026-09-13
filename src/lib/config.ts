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
