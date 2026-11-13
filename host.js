/**
 * Host half of dsh-session-todo.
 *
 * It owns the durable todo/read state, the idempotent terminal-result reducer,
 * and one authenticated Connection RPC channel. Rendering belongs to client-v2.js.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MAX_NOTE_LENGTH,
  addTask,
  applyCatchUpWatermark,
  createGroup,
  createInitialState,
  deleteGroup,
  markAllRead,
  markRead,
  moveTask,
  normalizeState,
  recordResult,
  removeTask,
  reorderGroup,
  resultKindOf,
  setTaskAlias,
  setTaskCompleted,
  setTaskNote,
  snapshotForClient,
  updateGroup,
} from './lib/todo-model.js'
import { commitMutation } from './lib/todo-state-store.js'
import { atomicWriteJson, loadJsonFile, moveAside } from './lib/todo-storage.js'
import { prepareNativeHelper } from './lib/native-helper.js'

const CHANNEL = '/dsh-session-todo-desktop2'
const LOG = '[dsh-session-todo]'
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))
const HELPER_PATH = join(PLUGIN_DIR, 'helper', 'dsh-session-todo-helper-v4.exe')
const NATIVE_HELPER_AVAILABLE = process.platform === 'win32' && existsSync(HELPER_PATH)

export const inject = ['connection', 'sessions', 'webServer']

/** Register the Host service after connection and the session store exist. */
export function apply(ctx) {
  const home = process.env.DSH_HOME || process.env.DSH_PROFILE_DIR || process.cwd()
  const stateFile = join(home, 'storages', 'dsh-session-todo', 'state.json')

  let state = createInitialState()
  let ready = false
  let disposed = false
  let loadedFrom = 'new'
  let persistTail = Promise.resolve()
  let mutationTail = Promise.resolve()
  let helperProcess = null
  let helperReader = null
  let helperOpening = null
  let helperStartup = null
  let viewRequest = null
  let viewTimer = null
  let renameRequest = null
  let renameTimer = null
  let sessionInfo = {}
  let liveRevision = 0
  const runningSources = new Map()
  const eventClients = new Set()

  const readyPromise = initialize()
  readyPromise.catch((error) => logError('initialization failed', error))

  async function initialize() {
    try {
      const loaded = await loadJsonFile(stateFile)
      if (loaded.error) {
        const aside = await moveAside(stateFile, 'invalid-json')
        state = createInitialState()
        loadedFrom = aside ? 'recovered-invalid-json' : 'new-after-invalid-json'
        logError('state file is invalid; starting from a new baseline', loaded.error, aside ? `moved to ${aside}` : 'no backup')
        await persistState(state).catch((error) => logError('initial write failed', error))
      } else if (loaded.value === null) {
        state = createInitialState()
        loadedFrom = 'new'
        await persistState(state).catch((error) => logError('initial write failed', error))
      } else {
        const normalized = normalizeState(loaded.value)
        if (!normalized.migrated) {
          const aside = await moveAside(stateFile, 'schema-version')
          state = createInitialState()
          loadedFrom = aside ? 'recovered-schema-version' : 'new-after-schema-version'
          logError('state schema version is not supported; previous generation moved aside', aside)
          await persistState(state).catch((error) => logError('initial write failed', error))
        } else {
          state = normalized.state
          loadedFrom = 'existing'
          if (JSON.stringify(state) !== JSON.stringify(loaded.value)) await persistState(state)
        }
      }
    } finally {
      ready = true
      log(`state ${loadedFrom}; ${Object.keys(state.tasks).length} task(s), ${Object.keys(state.results).length} result(s), revision ${state.revision}`)
    }
  }

  function currentSnapshot() {
    const registry = ctx.get('workspaceRegistry')
    let workspaces = []
    if (registry) {
      try {
        workspaces = registry.list().map((workspace) => ({
          workspaceId: workspace.id,
          title: workspace.title,
          path: workspace.path,
          sessionIds: [...workspace.sessionIds],
        }))
      } catch (error) {
        logError('workspace snapshot failed', error)
      }
    }
    return {
      ...snapshotForClient(state),
      workspaces,
      capabilities: {
        nativeHelper: NATIVE_HELPER_AVAILABLE,
        helperOpen: Boolean(helperProcess),
        navigationAck: true,
        events: true,
      },
      viewRequest,
      renameRequest,
      sessions: sessionInfo,
      liveRevision,
      storage: { loadedFrom },
    }
  }

  function persistState(value) {
    const copy = JSON.parse(JSON.stringify(value))
    const run = persistTail.then(() => atomicWriteJson(stateFile, copy))
    persistTail = run.catch(() => {})
    return run
  }

  /**
   * Apply one mutation in a single order. The mutator runs on a detached
   * candidate; only a successful durable write commits it to `state`.
   * Event-driven callers intentionally do not await this method.
   */
  function update(mutator, options = {}) {
    const run = mutationTail.then(async () => {
      await readyPromise
      if (disposed) throw new Error('plugin is disposed')
      const result = options.persist === false
        ? await (async () => {
          const candidate = structuredClone(state)
          const changed = mutator(candidate) !== false
          if (!changed) return { changed: false, state }
          candidate.revision = Math.max(0, Math.floor(Number(candidate.revision) || 0)) + 1
          return { changed: true, state: candidate }
        })()
        : await commitMutation(state, mutator, persistState)
      if (result.changed) {
        state = result.state
        broadcastHelper()
      }
      return { changed: result.changed, snapshot: currentSnapshot() }
    })
    mutationTail = run.catch(() => {})
    return run
  }

  function ok(value) {
    return { ok: true, value }
  }

  function fail(code, message, details = {}) {
    return { ok: false, error: { code, message, details } }
  }

  function requireString(payload, key, maxLength, required = true) {
    const value = payload && typeof payload === 'object' ? payload[key] : undefined
    if (typeof value !== 'string' || value.length === 0) {
      if (required) throw new Error(`${key} must be a non-empty string`)
      return undefined
    }
    if (value.length > maxLength) throw new Error(`${key} is too long`)
    return value
  }

  function optionalString(payload, key, maxLength) {
    const value = payload && typeof payload === 'object' ? payload[key] : undefined
    if (value === undefined || value === null) return undefined
    if (typeof value !== 'string' || value.length > maxLength) throw new Error(`${key} is invalid`)
    return value
  }

  function requireNumber(payload, key, required = true) {
    const value = payload && typeof payload === 'object' ? payload[key] : undefined
    if (value === undefined && !required) return undefined
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number`)
    return value
  }

  function errorResult(error) {
    if (error && error.code) return fail(error.code, error.message)
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('note must be')) return fail('note-too-long', message)
    if (message.includes('group name') || message.includes('group color') || message.includes('direction')) {
      return fail('invalid-group', message)
    }
    if (message.includes('group not found')) return fail('group-not-found', message)
    return fail('bad-request', message)
  }

  const handler = async (endpoint, payload) => {
    try {
      await readyPromise
      switch (endpoint) {
        case 'client/sessions': {
          if (!Array.isArray(payload?.sessions) || payload.sessions.length > 10000) return fail('bad-request', 'invalid session list')
          const next = {}
          runningSources.clear()
          for (const item of payload.sessions) {
            if (!item || typeof item.sessionId !== 'string' || item.sessionId.length > 200) continue
            const root = rootSessionId(ctx.sessions.get(item.sessionId)) || item.sessionId
            if (item.running === true) runningSources.set(item.sessionId, root)
            const previous = next[root]
            const pendingKind = ['approval', 'plan-review', 'question'].includes(item.pendingKind) ? item.pendingKind : null
            next[root] = {
              title: root === item.sessionId ? String(item.title || '').slice(0, 300) : (previous?.title || sessionInfo[root]?.title || ''),
              running: Boolean(previous?.running || item.running),
              pendingKind: pendingKind || previous?.pendingKind || null,
              archived: root === item.sessionId ? item.archived === true : previous?.archived === true,
            }
          }
          if (JSON.stringify(next) !== JSON.stringify(sessionInfo)) {
            sessionInfo = next; liveRevision++; broadcastHelper()
          }
          return ok({ accepted: true })
        }
        case 'session/rename/request': {
          if (renameRequest) return fail('busy', '另一个标题正在保存，请稍后重试')
          const sessionId = requireString(payload, 'sessionId', 200)
          const title = requireString(payload, 'title', 300).trim()
          if (!title) return fail('bad-request', '标题不能为空')
          const request = renameRequest = { sessionId, title, nonce: `rename-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: Date.now() }
          renameTimer = setTimeout(() => finishRename(false, '标题保存超时，请重试'), 15000)
          renameTimer.unref?.()
          broadcastHelper()
          return ok({ request, snapshot: currentSnapshot() })
        }
        case 'session/rename/ack': {
          if (!renameRequest || renameRequest.nonce !== payload?.nonce) return ok({ acknowledged: false })
          const request = renameRequest
          const success = payload.success === true
          if (success) {
            const title = optionalString(payload, 'title', 300) || request.title
            await update((next) => {
              const task = next.tasks[request.sessionId]
              if (!task) return false
              task.title = title; task.alias = ''; task.updatedAt = Date.now()
              return true
            })
            sessionInfo[request.sessionId] = { ...sessionInfo[request.sessionId], title }
            liveRevision++
          }
          finishRename(success, success ? '' : optionalString(payload, 'error', 1000) || '标题保存失败')
          return ok({ acknowledged: true, snapshot: currentSnapshot() })
        }
        case 'snapshot':
          return ok({ snapshot: currentSnapshot(), outcome: {} })

        case 'window/open': {
          const opened = await openHelper()
          return ok({ ...opened, snapshot: currentSnapshot() })
        }

        case 'window/status':
          return ok({
            opened: Boolean(helperProcess),
            pid: helperProcess?.pid,
            snapshot: currentSnapshot(),
          })

        case 'window/close':
          closeHelper()
          return ok({ closed: true, snapshot: currentSnapshot() })

        case 'view/request': {
          const sessionId = requireString(payload, 'sessionId', 200)
          if (viewTimer) clearTimeout(viewTimer)
          viewRequest = { sessionId, nonce: `view-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: Date.now() }
          const request = viewRequest
          viewTimer = setTimeout(() => {
            if (viewRequest?.nonce !== request.nonce) return
            finishView(false, 'DSH 页面未确认跳转，请刷新 DSH 后重试')
          }, 15000)
          viewTimer.unref?.()
          writeHelper({ type: 'view', request })
          broadcastHelper()
          return ok({ request, snapshot: currentSnapshot() })
        }

        case 'view/ack': {
          const nonce = requireString(payload, 'nonce', 120)
          if (!viewRequest || viewRequest.nonce !== nonce) return ok({ acknowledged: false, snapshot: currentSnapshot() })
          const error = optionalString(payload, 'error', 1000)
          const success = payload?.success === true
          finishView(success, error || (success ? '' : '会话导航组件需要刷新，请刷新 DSH 后重试'))
          return ok({ acknowledged: true, snapshot: currentSnapshot() })
        }

        case 'task/add': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const title = optionalString(payload, 'title', 300) ?? ''
          const groupId = optionalString(payload, 'groupId', 80)
          let outcome
          const result = await update((next) => {
            const added = addTask(next, { sessionId, title, groupId })
            outcome = added
            return added.created
          })
          return ok({ ...result, outcome })
        }

        case 'task/remove': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const result = await update((next) => removeTask(next, sessionId))
          return ok({ ...result, outcome: { removed: result.changed } })
        }

        case 'task/complete': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const completed = payload && payload.completed === true
          const result = await update((next) => setTaskCompleted(next, sessionId, completed))
          return ok({ ...result, outcome: { completed } })
        }

        case 'task/note': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const note = optionalString(payload, 'note', MAX_NOTE_LENGTH)
          if (note === undefined) return fail('bad-request', 'note must be a string')
          try {
            const result = await update((next) => setTaskNote(next, sessionId, note))
            return ok({ ...result, outcome: { length: note.length } })
          } catch (error) {
            return errorResult(error)
          }
        }

        case 'task/alias': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const alias = optionalString(payload, 'alias', 300)
          if (alias === undefined) return fail('bad-request', 'alias must be a string')
          const result = await update((next) => setTaskAlias(next, sessionId, alias))
          return ok({ ...result, outcome: { alias } })
        }

        case 'task/title': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const title = requireString(payload, 'title', 300).trim()
          if (!title) return fail('bad-request', '标题不能为空')
          const result = await update((next) => {
            const task = next.tasks[sessionId]
            if (!task || (task.title === title && !task.alias)) return false
            task.title = title; task.alias = ''; task.updatedAt = Date.now()
            return true
          })
          return ok({ ...result, outcome: { title } })
        }

        case 'task/move': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const groupId = requireString(payload, 'groupId', 80)
          try {
            const result = await update((next) => moveTask(next, sessionId, groupId))
            return ok({ ...result, outcome: { groupId } })
          } catch (error) {
            return errorResult(error)
          }
        }

        case 'task/mark-read': {
          const sessionId = requireString(payload, 'sessionId', 200)
          const explicitVersion = requireNumber(payload, 'version', false)
          const version = explicitVersion ?? state.results[sessionId]?.version
          if (version === undefined) return fail('not-found', 'no readable result for this session')
          const result = await update((next) => markRead(next, sessionId, version))
          return ok({ ...result, outcome: { version } })
        }

        case 'mark-all-read': {
          const result = await update((next) => markAllRead(next))
          return ok({ ...result, outcome: { changed: result.changed } })
        }

        case 'group/create': {
          const name = requireString(payload, 'name', 40)
          const color = requireString(payload, 'color', 7)
          try {
            let group
            const result = await update((next) => {
              group = createGroup(next, { name, color })
              return true
            })
            return ok({ ...result, outcome: { group } })
          } catch (error) {
            return errorResult(error)
          }
        }

        case 'group/update': {
          const groupId = requireString(payload, 'groupId', 80)
          const name = optionalString(payload, 'name', 40)
          const color = optionalString(payload, 'color', 7)
          if (name === undefined && color === undefined) return fail('bad-request', 'name or color is required')
          try {
            const result = await update((next) => updateGroup(next, groupId, { name, color }))
            return ok({ ...result, outcome: { groupId } })
          } catch (error) {
            return errorResult(error)
          }
        }

        case 'group/delete': {
          const groupId = requireString(payload, 'groupId', 80)
          try {
            let removed = 0
            const result = await update((next) => {
              removed = deleteGroup(next, groupId)
              return true
            })
            return ok({ ...result, outcome: { removed } })
          } catch (error) {
            return errorResult(error)
          }
        }

        case 'group/reorder': {
          const groupId = requireString(payload, 'groupId', 80)
          const direction = optionalString(payload, 'direction', 4)
          const beforeId = optionalString(payload, 'beforeId', 80)
          try {
            const result = await update((next) => reorderGroup(next, groupId, direction, beforeId))
            return ok({ ...result, outcome: { direction } })
          } catch (error) {
            return errorResult(error)
          }
        }

        default:
          return fail('not-found', `unknown endpoint ${endpoint}`)
      }
    } catch (error) {
      return errorResult(error)
    }
  }

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: CHANNEL,
      handler: httpHandler,
    }),
    'dsh-session-todo: authenticated HTTP route',
  )

  async function httpHandler(req, res) {
    try {
      const admission = ctx.connection.admit(req)
      if ('rejection' in admission) {
        res.writeHead(admission.rejection, { 'content-type': 'text/plain; charset=utf-8' })
        res.end(admission.rejection === 401 ? 'unauthorized' : 'forbidden')
        return
      }
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
      if (req.method === 'GET' && requestUrl.pathname === `${CHANNEL}/events`) {
        if (eventClients.size >= 8) { res.writeHead(429); res.end(); return }
        res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-content-type-options': 'nosniff' })
        res.flushHeaders?.()
        const client = { res, keepAlive: null }
        eventClients.add(client)
        client.keepAlive = setInterval(() => { try { res.write(': keepalive\n\n') } catch { removeEventClient(client) } }, 25000)
        client.keepAlive.unref?.()
        res.on('close', () => removeEventClient(client))
        writeEvent(client)
        return
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' })
        res.end('method not allowed')
        return
      }
      if (requestUrl.pathname !== CHANNEL) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }

      const chunks = []
      let bytes = 0
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > 256 * 1024) {
          res.writeHead(413, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('request too large')
          req.destroy()
          return
        }
        chunks.push(chunk)
      }

      let body
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(fail('bad-request', 'body is not JSON')))
        return
      }
      if (!body || typeof body.endpoint !== 'string') {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(fail('bad-request', 'endpoint is required')))
        return
      }

      const result = await handler(body.endpoint, body.payload)
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(JSON.stringify(result))
    } catch (error) {
      logError('HTTP route failed', error)
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(fail('internal', 'request failed')))
      } else {
        try { res.end() } catch { /* response is already failing */ }
      }
    }
  }

  ctx.on('session/event', (session, event) => {
    if (event.type === 'turn/start' || event.type === 'turn/end') {
      const id = rootSessionId(session)
      if (id) {
        if (event.type === 'turn/start') runningSources.set(session.id, id)
        else runningSources.delete(session.id)
        sessionInfo[id] = { ...sessionInfo[id], running: [...runningSources.values()].includes(id) }
        liveRevision++; broadcastHelper()
      }
    }
    if (event.type !== 'turn/end') return
    const kind = resultKindOf(event.data?.reason)
    if (!kind) return
    const sessionId = rootSessionId(session)
    if (!sessionId) return
    void update((next) => recordResult(next, {
      sessionId,
      sourceSessionId: session.id,
      seq: Number(event.seq),
      turn: Number(event.data?.turn ?? 0),
      kind,
      at: Number(event.time || Date.now()),
    })).catch((error) => logError('record turn/end failed', error))
  })

  ctx.on('agent/error', (payload) => {
    try {
      const sourceSessionId = payload?.agent?.id
      const session = sourceSessionId ? ctx.sessions.get(sourceSessionId) : undefined
      const sessionId = session ? rootSessionId(session) : sourceSessionId
      if (!sessionId || !sourceSessionId) return
      void update((next) => recordResult(next, {
        sessionId,
        sourceSessionId,
        seq: session ? Number(session.seq) : 0,
        turn: Number(payload?.turn ?? 0),
        kind: 'error',
        at: Date.now(),
      })).catch((error) => logError('record agent error failed', error))
    } catch (error) {
      logError('agent/error observer failed', error)
    }
  })

  ctx.on('approval/request', (request, next) => {
    try {
      const sessionId = request?.agent?.id
      if (sessionId) markAttention(sessionId, 'approval')
    } catch (error) {
      logError('approval observer failed', error)
    }
    return next()
  })

  ctx.on('user-questions/request', (request, next) => {
    try {
      const sessionId = request?.agent?.id
      if (sessionId) {
        const planReview = Array.isArray(request.questions)
          && request.questions.some((question) => question?.intent?.kind === 'plan-review')
        markAttention(sessionId, planReview ? 'plan-review' : 'question')
      }
    } catch (error) {
      logError('user-question observer failed', error)
    }
    return next()
  })

  ctx.inject(['workspaceRegistry', 'sessionQuery'], () => {
    void catchUp()
  })

  ctx.effect(() => () => {
    disposed = true
    for (const client of eventClients) { removeEventClient(client); try { client.res.end() } catch {} }
    closeHelper()
  }, 'dsh-session-todo: lifecycle')

  function markAttention(sourceSessionId, kind) {
    const session = ctx.sessions.get(sourceSessionId)
    const sessionIdForResult = session ? rootSessionId(session) : sourceSessionId
    if (!sessionIdForResult) return
    void update((next) => recordResult(next, {
      sessionId: sessionIdForResult,
      sourceSessionId,
      seq: session ? Number(session.seq) : 0,
      turn: 0,
      kind,
      at: Date.now(),
    })).catch((error) => logError(`record ${kind} failed`, error))
  }

  async function openHelper() {
    if (helperOpening) return helperOpening
    helperOpening = startHelper()
    try { return await helperOpening } finally { helperOpening = null }
  }

  async function startHelper() {
    if (helperProcess) {
      writeHelper({ type: 'focus' })
      broadcastHelper()
      return { opened: true, pid: helperProcess.pid, helper: 'wpf', alreadyOpen: true }
    }
    if (!NATIVE_HELPER_AVAILABLE) {
      return {
        opened: false,
        reason: process.platform === 'win32'
          ? '桌面窗口组件不可用。'
          : '当前平台不支持独立桌面窗口。',
      }
    }
    let child
    try {
      const cacheRoot = join(process.env.LOCALAPPDATA || dirname(stateFile), 'DSH Session Todo', 'native')
      const executable = await prepareNativeHelper(HELPER_PATH, cacheRoot)
      if (disposed) return { opened: false, reason: 'DSH 已关闭' }
      log(`native helper cache ${executable.path}; sha256=${executable.sha256}`)
      child = spawn(executable.path, [], {
        cwd: dirname(executable.path),
        env: { ...process.env, DSH_SESSION_TODO_LOG_DIR: dirname(stateFile), DSH_SESSION_TODO_OWNER_PID: String(process.ppid) },
        windowsHide: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (error) {
      return { opened: false, reason: `桌面窗口启动失败：${error?.message || String(error)}` }
    }

    const spawned = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, reason: '桌面窗口启动超时。' }), 2500)
      child.once('spawn', () => {
        clearTimeout(timer)
        resolve({ ok: true })
      })
      child.once('error', (error) => {
        clearTimeout(timer)
        resolve({ ok: false, reason: `桌面窗口启动失败：${error?.message || String(error)}` })
      })
    })
    if (!spawned.ok) {
      try { child.kill() } catch { /* already gone */ }
      return { opened: false, reason: spawned.reason }
    }

    if (disposed) { try { child.kill() } catch {} return { opened: false, reason: 'DSH 已关闭' } }

    helperProcess = child
    const startup = new Promise(resolve => {
      const timer = setTimeout(() => { if (helperStartup?.child === child) helperStartup = null; resolve({ opened: false, reason: '桌面浮窗启动未确认，请重试' }) }, 5000)
      helperStartup = { child, finish: result => { clearTimeout(timer); helperStartup = null; resolve(result) } }
    })
    helperReader = createInterface({ input: child.stdout })
    helperReader.on('line', (line) => { void handleHelperLine(line) })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) logError('helper stderr', text)
    })
    child.stdin.on('error', (error) => logError('helper stdin failed', error))
    child.on('exit', (code, signal) => {
      if (helperProcess !== child) return
      if (helperStartup?.child === child) helperStartup.finish({ opened: false, reason: '桌面浮窗在启动完成前退出' })
      helperProcess = null
      viewRequest = null
      if (viewTimer) clearTimeout(viewTimer)
      viewTimer = null
      if (renameTimer) clearTimeout(renameTimer)
      renameTimer = null; renameRequest = null
      if (helperReader) {
        try { helperReader.close() } catch { /* reader is already closing */ }
        helperReader = null
      }
      log(`Windows helper exited (code ${code ?? 'null'}, signal ${signal ?? 'null'})`)
      broadcastHelper()
    })
    writeHelper({ type: 'state', data: currentSnapshot() })
    const result = await startup
    if (!result.opened && helperProcess === child) closeHelper()
    return result
  }

  function closeHelper() {
    if (helperStartup) helperStartup.finish({ opened: false, reason: '桌面浮窗已关闭' })
    const child = helperProcess
    helperProcess = null
    viewRequest = null
    if (viewTimer) clearTimeout(viewTimer)
    viewTimer = null
    if (renameTimer) clearTimeout(renameTimer)
    renameTimer = null; renameRequest = null
    if (helperReader) {
      try { helperReader.close() } catch { /* reader is already closing */ }
      helperReader = null
    }
    if (child) {
      try { child.kill() } catch { /* process already exited */ }
    }
  }

  function writeHelper(message) {
    if (!helperProcess || !helperProcess.stdin || !helperProcess.stdin.writable) return false
    try {
      helperProcess.stdin.write(`${JSON.stringify(message)}\n`)
      return true
    } catch (error) {
      logError('helper write failed', error)
      return false
    }
  }

  function broadcastHelper() {
    for (const client of eventClients) writeEvent(client)
    if (!helperProcess) return
    writeHelper({ type: 'state', data: currentSnapshot() })
  }

  function removeEventClient(client) {
    clearInterval(client.keepAlive)
    eventClients.delete(client)
  }

  function writeEvent(client) {
    try {
      if (client.res.writableLength > 65536) { removeEventClient(client); client.res.end(); return }
      client.res.write(`data: ${JSON.stringify({ revision: state.revision, liveRevision, viewNonce: viewRequest?.nonce ?? null, renameNonce: renameRequest?.nonce ?? null })}\n\n`)
    } catch { removeEventClient(client) }
  }

  function finishView(success, error) {
    const request = viewRequest
    viewRequest = null
    if (viewTimer) clearTimeout(viewTimer)
    viewTimer = null
    if (request) writeHelper({ type: 'view/result', nonce: request.nonce, sessionId: request.sessionId, success, message: error })
    broadcastHelper()
  }

  function finishRename(success, message) {
    const request = renameRequest
    renameRequest = null
    if (renameTimer) clearTimeout(renameTimer)
    renameTimer = null
    if (request) writeHelper({ type: 'rename/result', sessionId: request.sessionId, nonce: request.nonce, success, message })
    broadcastHelper()
  }

  async function handleHelperLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      logError('helper sent non-JSON output', line)
      return
    }
    if (message?.type === 'ready' && helperStartup) {
      const integrityLevel = Number(message.integrityLevel)
      log(`native helper ready pid=${helperProcess?.pid} integrity=${integrityLevel}`)
      helperStartup.finish(integrityLevel >= 8192
        ? { opened: true, pid: helperProcess?.pid, helper: 'wpf' }
        : { opened: false, reason: '桌面浮窗受到系统限制，请重新打开' })
      return
    }
    if (!message || message.type !== 'action' || typeof message.endpoint !== 'string') return
    if (message.endpoint === 'view') {
      const sessionId = message.payload?.sessionId
      if (typeof sessionId === 'string' && sessionId.length > 0) {
        await handler('view/request', { sessionId })
      }
      return
    }
    try {
      const result = await handler(message.endpoint, message.payload)
      if (!result.ok) {
        writeHelper({ type: 'error', message: result.error?.message || '操作失败' })
      }
      broadcastHelper()
    } catch (error) {
      logError('helper action failed', error)
      writeHelper({ type: 'error', message: error?.message || '操作失败' })
    }
  }

  function rootSessionId(session) {
    let current = session
    for (let depth = 0; depth < 8 && current; depth += 1) {
      const header = current.header
      if (!header || header.origin !== 'subagent') return current.id
      const parentId = header.parentSession
      if (!parentId) return current.id
      const parent = ctx.sessions.get(parentId)
      if (!parent) return parentId
      current = parent
    }
    return current?.id
  }

  async function catchUp() {
    await readyPromise
    const registry = ctx.get('workspaceRegistry')
    const query = ctx.get('sessionQuery')
    if (!registry || !query) return

    const scanStartedAt = Date.now()
    const since = Number(state.lastRunAt || scanStartedAt)
    const rootSessionIds = new Set()
    try {
      for (const workspace of registry.list()) {
        for (const sessionId of workspace.sessionIds) rootSessionIds.add(sessionId)
      }
    } catch (error) {
      logError('workspace listing failed during catch-up', error)
      return
    }
    if (rootSessionIds.size === 0) return

    let failed = false
    let recovered = 0
    const recordsById = new Map()
    try {
      const records = await query.listSessions()
      for (const record of records) recordsById.set(record.header.id, record)
    } catch (error) {
      failed = true
      logError('session listing failed during catch-up; watermark remains retryable', error)
    }

    const sources = new Map()
    for (const rootSessionId of rootSessionIds) sources.set(rootSessionId, rootSessionId)
    for (const [sessionId, record] of recordsById) {
      if (sources.has(sessionId)) continue
      let current = sessionId
      let root
      for (let depth = 0; depth < 8; depth += 1) {
        if (rootSessionIds.has(current)) { root = current; break }
        const currentRecord = recordsById.get(current)
        if (!currentRecord) break
        const parent = currentRecord.header.parentSession
        if (!parent) break
        current = parent
      }
      if (root) sources.set(sessionId, root)
      // A source whose parent chain is not in the workspace corpus is not a
      // child of any visible main Session and contributes no parent reminder.
    }

    for (const [sourceSessionId, rootSessionId] of sources) {
      try {
        const docs = await query.filterEvents(sourceSessionId, [
          { kind: 'type', values: ['turn/end'] },
          { kind: 'time', from: since },
        ])
        let result = null
        let recoveredOne = false
        // Newest first: a forked or user-aborted end is not a reminder, but an
        // older completed/error end in the same window may still be one.
        for (let index = docs.length - 1; index >= 0; index -= 1) {
          const full = await query.readEvent({ sessionId: sourceSessionId, seq: docs[index].seq })
          const kind = resultKindOf(full.target?.data?.reason)
          if (!kind) continue
          result = await update((next) => recordResult(next, {
            sessionId: rootSessionId,
            sourceSessionId,
            seq: Number(full.target.seq),
            turn: Number(full.target.data?.turn ?? 0),
            kind,
            at: Number(full.target.time || Date.now()),
          }))
          recoveredOne = result.changed
          break
        }
        if (recoveredOne) recovered += 1
      } catch (error) {
        failed = true
        logError(`catch-up failed for ${sourceSessionId}`, error)
      }
    }

    // One retryable watermark: only a fully successful pass may move it past
    // `scanStartedAt`. A failed source therefore remains inside every later
    // scan instead of being skipped by another Session's progress.
    if (!failed) {
      try {
        await update((next) => applyCatchUpWatermark(next, scanStartedAt, failed))
      } catch (error) {
        failed = true
        logError('catch-up watermark write failed; remains retryable', error)
      }
    }
    if (recovered > 0) log(`catch-up recovered ${recovered} result(s) after ${new Date(since).toISOString()}`)
    if (failed) log('catch-up remains incomplete; the previous watermark is retained for retry')
  }

  function logError(message, error, extra) {
    console.warn(LOG, message, error instanceof Error ? error.message : error, extra ?? '')
  }
}

function log(message) {
  console.info(LOG, message)
}
