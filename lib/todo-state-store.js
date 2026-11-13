/**
 * Transactional mutation helper: mutate a detached candidate, persist it, and
 * only then publish it as the next in-memory state. A failed write cannot leave
 * the caller-visible state ahead of durable storage.
 */

export async function commitMutation(current, mutate, persist) {
  const candidate = structuredClone(current)
  const changed = mutate(candidate) !== false
  if (!changed) return { changed: false, state: current }
  candidate.revision = Math.max(0, Math.floor(Number(candidate.revision) || 0)) + 1
  await persist(candidate)
  return { changed: true, state: candidate }
}
