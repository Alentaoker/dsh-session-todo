/**
 * Atomic JSON storage for plugin-owned, non-session state.
 *
 * The file is written to a same-directory temp file, fsynced, then renamed over
 * the previous generation. A failed write leaves the previous file intact.
 */

import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function loadJsonFile(filePath) {
  try {
    const text = await readFile(filePath, 'utf8')
    return { value: JSON.parse(text), text, error: null }
  } catch (error) {
    if (error && error.code === 'ENOENT') return { value: null, text: null, error: null }
    return { value: null, text: null, error }
  }
}

export async function atomicWriteJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true })
  const text = `${JSON.stringify(value, null, 2)}\n`
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  let handle
  try {
    handle = await open(tempPath, 'w')
    await handle.writeFile(text, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await renameWithRetry(tempPath, filePath)
  } catch (error) {
    if (handle) {
      try { await handle.close() } catch { /* the handle is already failing */ }
    }
    try { await rm(tempPath, { force: true }) } catch { /* best-effort temp cleanup */ }
    throw error
  }
}

async function renameWithRetry(from, to) {
  let lastError
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      lastError = error
      if (!error || !['EPERM', 'EACCES', 'EBUSY', 'EEXIST'].includes(error.code)) throw error
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function moveAside(filePath, reason) {
  const suffix = `.corrupt-${Date.now()}`
  const target = `${filePath}${suffix}`
  try {
    await rename(filePath, target)
    return target
  } catch {
    try {
      const text = await readFile(filePath, 'utf8')
      await writeFile(target, text, 'utf8')
      await rm(filePath, { force: true })
      return target
    } catch {
      return null
    }
  }
}
