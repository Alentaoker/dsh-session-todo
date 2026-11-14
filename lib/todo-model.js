/** Durable session todo state, independent of the DSH service layer. */

import { randomUUID } from 'node:crypto'

export const SCHEMA_VERSION = 1
export const MAX_NOTE_LENGTH = 2000
export const MAX_TITLE_LENGTH = 300
export const MAX_GROUP_NAME_LENGTH = 40
export const GROUP_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export const UNASSIGNED_GROUP = Object.freeze({
  id: 'unassigned',
  name: '未分区',
  color: '#8A8F98',
})

export const DEFAULT_GROUP = Object.freeze({ id: 'default', name: '默认分组', color: '#D2AC54' })
export const DEFAULT_GROUPS = Object.freeze([
  DEFAULT_GROUP,
])

const RESULT_KINDS = new Set([
  'completed',
  'error',
  'blocked',
  'attention',
  'interrupted',
  'approval',
  'plan-review',
  'question',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function safeText(value, maxLength) {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function validGroupName(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= MAX_GROUP_NAME_LENGTH
}

function validGroupColor(value) {
  return typeof value === 'string' && GROUP_COLOR_PATTERN.test(value)
}

function initialGroup(group, now) {
  return {
    id: group.id,
    name: group.name,
    color: group.color,
    createdAt: now,
  }
}

/**
 * Create a fresh state whose baseline starts now. A fresh state intentionally
 * contains no result records, so existing Session history is never unread.
 */
export function createInitialState(now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    lastRunAt: now,
    revision: 0,
    groups: DEFAULT_GROUPS.map((group) => initialGroup(group, now)),
    tasks: {},
    read: {},
    results: {},
    nextResultVersion: 1,
  }
}

/**
 * Validate and salvage a stored state. Unknown schema versions are rejected by
 * the caller through `migrated: false`; valid records are copied, never shared.
 */
export function normalizeState(raw, now = Date.now()) {
  if (!isRecord(raw) || raw.schemaVersion !== SCHEMA_VERSION) {
    return { state: createInitialState(now), migrated: false }
  }

  const groups = []
  const groupIds = new Set()
  const seenGroups = Array.isArray(raw.groups) ? raw.groups : []
  for (const candidate of seenGroups) {
    if (!isRecord(candidate)) continue
    const id = safeText(candidate.id, 80)
    if (!id || id === UNASSIGNED_GROUP.id || groupIds.has(id) || !validGroupName(candidate.name)) continue
    const color = validGroupColor(candidate.color) ? candidate.color : UNASSIGNED_GROUP.color
    groupIds.add(id)
    groups.push({
      id,
      name: candidate.name.trim(),
      color,
      createdAt: finiteNumber(candidate.createdAt, now),
    })
  }
  if (!groupIds.has(DEFAULT_GROUP.id)) {
    groups.unshift(initialGroup(DEFAULT_GROUP, now))
    groupIds.add(DEFAULT_GROUP.id)
  }

  const tasks = {}
  const seenTasks = isRecord(raw.tasks) ? raw.tasks : {}
  for (const [sessionId, candidate] of Object.entries(seenTasks)) {
    if (!sessionId || !isRecord(candidate)) continue
    const groupId = groupIds.has(candidate.groupId) ? candidate.groupId : DEFAULT_GROUP.id
    const note = safeText(candidate.note, MAX_NOTE_LENGTH)
    const alias = safeText(candidate.alias, MAX_TITLE_LENGTH).trim()
    const completed = candidate.completed === true
    tasks[sessionId] = {
      sessionId,
      title: safeText(candidate.title, MAX_TITLE_LENGTH),
      groupId,
      completed,
      note,
      alias,
      addedAt: finiteNumber(candidate.addedAt, now),
      completedAt: completed ? finiteNumber(candidate.completedAt, now) : null,
      updatedAt: finiteNumber(candidate.updatedAt, now),
    }
  }

  const read = {}
  const seenRead = isRecord(raw.read) ? raw.read : {}
  for (const [sessionId, value] of Object.entries(seenRead)) {
    if (!sessionId) continue
    const cursor = finiteNumber(value, -1)
    if (cursor >= 0) read[sessionId] = cursor
  }

  const results = {}
  const seenResults = isRecord(raw.results) ? raw.results : {}
  let nextResultVersion = Math.max(1, Math.floor(finiteNumber(raw.nextResultVersion, 1)))
  for (const [sessionId, candidate] of Object.entries(seenResults)) {
    if (!sessionId || !isRecord(candidate)) continue
    if (!RESULT_KINDS.has(candidate.kind)) continue
    const sourceSessionId = safeText(candidate.sourceSessionId, 200) || sessionId
    const sourceSeq = finiteNumber(candidate.sourceSeq, finiteNumber(candidate.seq, -1))
    if (sourceSeq < 0) continue
    // Version 1 states used the source event seq as both identity and read
    // cursor. Preserve that pairing without letting heterogeneous session seqs
    // participate in a new comparison.
    const version = finiteNumber(candidate.version, sourceSeq)
    if (version < 0) continue
    nextResultVersion = Math.max(nextResultVersion, version + 1)
    results[sessionId] = {
      version,
      sourceSessionId,
      sourceSeq,
      turn: finiteNumber(candidate.turn, 0),
      kind: candidate.kind,
      at: finiteNumber(candidate.at, now),
    }
  }

  return {
    state: {
      schemaVersion: SCHEMA_VERSION,
      createdAt: finiteNumber(raw.createdAt, now),
      lastRunAt: finiteNumber(raw.lastRunAt, now),
      revision: Math.max(0, Math.floor(finiteNumber(raw.revision, 0))),
      groups,
      tasks,
      read,
      results,
      nextResultVersion,
    },
    migrated: true,
  }
}

/** Return whether the latest recorded result has not been read. */
export function isUnread(state, sessionId) {
  const result = state.results[sessionId]
  if (!result) return false
  return result.version > (state.read[sessionId] ?? 0)
}

/**
 * Record a terminal result with a result-version cursor.
 *
 * `seq` belongs to `sourceSessionId` (which may be a subagent), so it is never
 * compared with the host session's log sequence. The monotonic version is the
 * only cross-session ordering value; events from distinct sources are ordered
 * by durable event time, with the source identity kept for display.
 */
export function recordResult(state, {
  sessionId,
  sourceSessionId = sessionId,
  seq,
  turn = 0,
  kind,
  at = Date.now(),
}) {
  if (!sessionId || !RESULT_KINDS.has(kind)) return false
  const sourceSeq = finiteNumber(seq, -1)
  if (sourceSeq < 0) return false
  const source = sourceSessionId || sessionId
  const eventTime = finiteNumber(at, Date.now())
  const previous = state.results[sessionId]
  if (previous) {
    if (previous.sourceSessionId === source) {
      if (sourceSeq <= previous.sourceSeq) return false
    } else if (eventTime < previous.at) {
      return false
    }
  }
  const version = Math.max(1, Math.floor(finiteNumber(state.nextResultVersion, 1)))
  state.nextResultVersion = version + 1
  state.results[sessionId] = {
    version,
    sourceSessionId: source,
    sourceSeq,
    turn: finiteNumber(turn, 0),
    kind,
    at: eventTime,
  }
  return true
}

/** Add a session once; repeated calls return `created: false`. */
export function addTask(state, { sessionId, title = '', groupId, now = Date.now() }) {
  if (!sessionId) return { created: false, reason: 'missing-session' }
  if (state.tasks[sessionId]) return { created: false, reason: 'already-present' }
  const targetGroup = state.groups.some((group) => group.id === groupId)
    ? groupId
    : DEFAULT_GROUP.id
  if (groupId && groupId !== UNASSIGNED_GROUP.id && !state.groups.some((group) => group.id === groupId)) throw new Error('group not found')
  state.tasks[sessionId] = {
    sessionId,
    title: safeText(title, MAX_TITLE_LENGTH),
    groupId: targetGroup,
    completed: false,
    note: '',
    alias: '',
    addedAt: now,
    completedAt: null,
    updatedAt: now,
  }
  return { created: true, groupId: targetGroup }
}

/** Remove a task while leaving its unread cursor and result untouched. */
export function removeTask(state, sessionId) {
  if (!state.tasks[sessionId]) return false
  delete state.tasks[sessionId]
  return true
}

/** Complete or restore a task without changing its group, note, or read cursor. */
export function setTaskCompleted(state, sessionId, completed, now = Date.now()) {
  const task = state.tasks[sessionId]
  if (!task) return false
  const next = completed === true
  if (task.completed === next) return false
  task.completed = next
  task.completedAt = next ? now : null
  task.updatedAt = now
  return true
}

/** Persist a personal note. Notes never enter model context. */
export function setTaskNote(state, sessionId, note, now = Date.now()) {
  const task = state.tasks[sessionId]
  if (!task) return false
  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
    throw new Error(`note must be a string of at most ${MAX_NOTE_LENGTH} characters`)
  }
  if (task.note === note) return false
  task.note = note
  task.updatedAt = now
  return true
}

/** Set or clear the display alias while preserving the original title. */
export function setTaskAlias(state, sessionId, alias, now = Date.now()) {
  const task = state.tasks[sessionId]
  if (!task) return false
  const next = safeText(alias, MAX_TITLE_LENGTH).trim()
  if (task.alias === next) return false
  task.alias = next
  task.updatedAt = now
  return true
}

/** Move a task to an existing group; the system unassigned group is valid. */
export function moveTask(state, sessionId, groupId, now = Date.now()) {
  if (groupId === UNASSIGNED_GROUP.id) groupId = DEFAULT_GROUP.id
  const task = state.tasks[sessionId]
  if (!task) return false
  if (groupId !== UNASSIGNED_GROUP.id && !state.groups.some((group) => group.id === groupId)) {
    throw new Error('group not found')
  }
  if (task.groupId === groupId) return false
  task.groupId = groupId
  task.updatedAt = now
  return true
}

/** Create a custom group at the end of the durable group order. */
export function createGroup(state, { name, color, now = Date.now() }) {
  if (!validGroupName(name)) throw new Error(`group name must be 1-${MAX_GROUP_NAME_LENGTH} characters`)
  if (!validGroupColor(color)) throw new Error('group color must be #RRGGBB')
  const group = {
    id: `g-${randomUUID()}`,
    name: name.trim(),
    color,
    createdAt: now,
  }
  state.groups.push(group)
  return group
}

/** Rename and/or recolor one custom group. */
export function updateGroup(state, groupId, { name, color }) {
  const group = state.groups.find((candidate) => candidate.id === groupId)
  if (!group) throw new Error('group not found')
  if (name !== undefined) {
    if (!validGroupName(name)) throw new Error(`group name must be 1-${MAX_GROUP_NAME_LENGTH} characters`)
    group.name = name.trim()
  }
  if (color !== undefined) {
    if (!validGroupColor(color)) throw new Error('group color must be #RRGGBB')
    group.color = color
  }
  return true
}

/** Delete one group and remove its member tasks; Session history is untouched. */
export function deleteGroup(state, groupId, now = Date.now()) {
  if (groupId === DEFAULT_GROUP.id) throw new Error('默认分组不能删除')
  const index = state.groups.findIndex((group) => group.id === groupId)
  if (index < 0) throw new Error('group not found')
  state.groups.splice(index, 1)
  let removed = 0
  for (const task of Object.values(state.tasks)) {
    if (task.groupId !== groupId) continue
    delete state.tasks[task.sessionId]
    removed += 1
  }
  return removed
}

/** Move one group one position up or down. */
export function reorderGroup(state, groupId, direction, beforeId) {
  const index = state.groups.findIndex((group) => group.id === groupId)
  if (index < 0) throw new Error('group not found')
  if (beforeId !== undefined) {
    const target = state.groups.findIndex((group) => group.id === beforeId)
    if (target < 0) throw new Error('target group not found')
    if (groupId === beforeId || index + 1 === target) return false
    const [group] = state.groups.splice(index, 1)
    state.groups.splice(target > index ? target - 1 : target, 0, group)
    return true
  }
  if (direction === 'end') {
    if (index === state.groups.length - 1) return false
    state.groups.push(...state.groups.splice(index, 1))
    return true
  }
  const delta = direction === 'up' ? -1 : direction === 'down' ? 1 : 0
  if (delta === 0) throw new Error('direction must be up or down')
  const target = index + delta
  if (target < 0 || target >= state.groups.length) return false
  const [group] = state.groups.splice(index, 1)
  state.groups.splice(target, 0, group)
  return true
}

/** Advance one read cursor monotonically; pending work can still remain. */
export function markRead(state, sessionId, version) {
  const result = state.results[sessionId]
  const target = typeof version === 'number' && Number.isFinite(version)
    ? version
    : result?.version
  if (typeof target !== 'number' || target < 0) return false
  const current = state.read[sessionId] ?? 0
  if (target <= current) return false
  state.read[sessionId] = target
  return true
}

/** Mark every recorded result as read; unread cursors remain independent. */
export function markAllRead(state) {
  let changed = 0
  for (const [sessionId, result] of Object.entries(state.results)) {
    if (markRead(state, sessionId, result.version)) changed += 1
  }
  return changed
}

/**
 * Move the retryable catch-up watermark only after a fully successful pass.
 * A failed source keeps the previous watermark, so its events are scanned
 * again even when other Sessions advanced.
 */
export function applyCatchUpWatermark(state, scanStartedAt, failed) {
  if (failed) return false
  if (!Number.isFinite(scanStartedAt) || scanStartedAt <= state.lastRunAt) return false
  state.lastRunAt = scanStartedAt
  return true
}

/** Build the plain JSON snapshot sent to the Client. */
export function snapshotForClient(state, now = Date.now()) {
  return {
    schemaVersion: state.schemaVersion,
    createdAt: state.createdAt,
    lastRunAt: state.lastRunAt,
    revision: state.revision,
    groups: state.groups.map((group) => ({ ...group })),
    tasks: Object.fromEntries(Object.entries(state.tasks).map(([id, task]) => [id, { ...task }])),
    read: { ...state.read },
    results: Object.fromEntries(Object.entries(state.results).map(([id, result]) => [id, { ...result }])),
    unassigned: { ...UNASSIGNED_GROUP },
    maxNoteLength: MAX_NOTE_LENGTH,
    serverTime: now,
  }
}

/**
 * Classify a durable `turn/end` reason. An unknown future reason is attention,
 * never success; user aborts and forks do not create a result reminder.
 */
export function resultKindOf(reason) {
  switch (reason?.kind) {
    case 'completed':
      return 'completed'
    case 'error':
      return 'error'
    case 'blocked':
      return 'blocked'
    case 'max-tokens':
      return 'attention'
    case 'interrupted':
      return 'interrupted'
    case 'aborted':
      return reason.reason?.kind === 'user' ? null : 'attention'
    case 'forked':
      return null
    default:
      return reason ? 'attention' : null
  }
}
