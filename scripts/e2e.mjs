#!/usr/bin/env node
/**
 * End-to-end protocol check against the real services, from Node — the same
 * steps the browser app takes: identity → JWT → create session → socket
 * subscribe → send a message → collect stream deltas and the final message.
 *
 *   node scripts/e2e.mjs [origin] [question]
 *
 * `origin` is sent as the socket handshake Origin header (default: the GH
 * Pages origin). Exits non-zero if no final agent message arrives in 90s.
 */
import { io } from 'socket.io-client'

const AI_AGENT_HOST = 'https://ai-agent-latest.productive.io'
const API_HOST = 'https://api.productive.io'
const ORGANIZATION_ID = '61715'
const PAT = 'ea4acece-79b1-45de-a45e-528846dff253'
const AGENT_CONFIG = { model: 'gpt-5.6-terra', reasoningEffort: 'low' }

const origin = process.argv[2] ?? 'https://ilucin.github.io'
const question = process.argv[3] ?? 'Hello, what can you help me with?'

const apiHeaders = {
  'X-Auth-Token': PAT,
  'X-Organization-Id': ORGANIZATION_ID,
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
}

const log = (...args) => console.log(new Date().toISOString().slice(11, 23), ...args)

// 1. identity
const params = new URLSearchParams({ 'filter[organization_id]': ORGANIZATION_ID, include: 'person,user' })
const memberships = await (await fetch(`${API_HOST}/api/v2/organization_memberships?${params}`, { headers: apiHeaders })).json()
const membership = memberships.data[0]
const personId = membership.relationships.person.data.id
const userId = membership.relationships.user.data.id
const email = memberships.included.find((r) => r.type === 'users' && r.id === userId).attributes.email
log('identity', { personId, userId, email })

// 2. jwt
const jwtResponse = await fetch(`${API_HOST}/api/v2/sessions/jwt`, {
  method: 'POST',
  headers: apiHeaders,
  body: JSON.stringify({ expires_in: 1800, type: 'write', organization_id: ORGANIZATION_ID, user_email: email, person_id: personId, user_id: userId }),
})
const { jwt, payload } = await jwtResponse.json()
log('jwt', jwtResponse.status, 'exp', new Date(payload.exp * 1000).toISOString())

// 3. session
const created = await fetch(`${AI_AGENT_HOST}/agent-sessions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify({ clientType: 'app-agent-chat', title: `e2e ${new Date().toISOString()}`, config: AGENT_CONFIG }),
})
const session = await created.json()
log('session', created.status, session.id, session.config)

// 4. socket
const socket = io(AI_AGENT_HOST, { transports: ['websocket'], upgrade: false, extraHeaders: { Origin: origin } })
const types = []
let streamed = ''
let final = null

const outcome = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve('timeout'), 90_000)
  socket.on('connect', () => {
    log('socket connected; transport', socket.io.engine.transport.name, 'path', socket.io.opts.path)
    socket.emit('subscribe', { jwt, agentSessionId: session.id })
    setTimeout(() => {
      socket.emit('agent-session-event', {
        jwt,
        event: { id: crypto.randomUUID(), agentSessionId: session.id, type: 'message', actor: 'client', timestamp: Date.now(), message: { text: question }, context: { items: [] } },
      })
      log('message sent')
    }, 300)
  })
  socket.on('connect_error', (error) => log('connect_error', error.message))
  socket.on('system-message', (payload) => log('system-message', JSON.stringify(payload)))
  socket.on('agent-session-event', ({ event }) => {
    const label = event.type === 'status' ? `status:${event.status?.type}` : event.type === 'processing-step' ? `step:${event.processingStep?.label}` : event.type
    if (event.type !== 'message-stream') log('event', label)
    types.push(event.type)
    if (event.type === 'message-stream') streamed += event.messageStream.text
    if (event.type === 'message' && event.actor === 'agent') final = event
    if (event.type === 'status' && event.status?.type === 'idle' && final) {
      clearTimeout(timer)
      resolve('ok')
    }
  })
})

const counts = types.reduce((acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), {})
log('outcome', outcome, counts)
log('streamed chars', streamed.length)
log('final message:', JSON.stringify(final?.message?.text?.slice(0, 300)))
socket.close()
process.exit(outcome === 'ok' && final ? 0 : 1)
