#!/usr/bin/env node
/**
 * Mints a long-lived assistant JWT for the demo user and prints it, so it can
 * be pasted into `DEMO_JWT` in `src/lib/config.ts`.
 *
 * Why this exists: the static app on GitHub Pages cannot call
 * `api.productive.io` itself — that host's CORS allowlist covers localhost and
 * *.productive.io only — so the token is minted here (no CORS in Node) and
 * shipped in the bundle. It is derived from the PAT that is already public in
 * this repo, so it exposes nothing new.
 *
 *   node scripts/mint-jwt.mjs [days]   (default 7)
 */
const API_HOST = 'https://api.productive.io'
const ORGANIZATION_ID = '61715'
const PAT = 'ea4acece-79b1-45de-a45e-528846dff253'

const days = Number(process.argv[2] ?? 7)
const headers = {
  'X-Auth-Token': PAT,
  'X-Organization-Id': ORGANIZATION_ID,
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
}

const params = new URLSearchParams({ 'filter[organization_id]': ORGANIZATION_ID, include: 'person,user' })
const memberships = await (await fetch(`${API_HOST}/api/v2/organization_memberships?${params}`, { headers })).json()
const membership = memberships.data[0]
const personId = membership.relationships.person.data.id
const userId = membership.relationships.user.data.id
const email = memberships.included.find((r) => r.type === 'users' && r.id === userId).attributes.email

const response = await fetch(`${API_HOST}/api/v2/sessions/jwt`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    expires_in: days * 86400,
    type: 'write',
    organization_id: ORGANIZATION_ID,
    user_email: email,
    person_id: personId,
    user_id: userId,
  }),
})
if (!response.ok) {
  console.error('mint failed', response.status, await response.text())
  process.exit(1)
}
const { jwt, payload } = await response.json()
console.error(`identity: person ${personId}, user ${userId}, ${email}`)
console.error(`expires:  ${new Date(payload.exp * 1000).toISOString()}`)
console.log(jwt)
