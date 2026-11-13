import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

/** Materialize trusted bundle bytes in the user's application cache. Writing a
 * new file preserves the cache directory's integrity label; copying the source
 * file's security attributes would carry a low-integrity workspace label over.
 * Content-addressed paths also leave already-running versions untouched. */
export async function prepareNativeHelper(sourcePath, cacheRoot) {
  const bytes = await readFile(sourcePath)
  const sha256 = digest(bytes)
  const directory = join(cacheRoot, sha256)
  await mkdir(directory, { recursive: true })
  const path = join(directory, 'dsh-session-todo-helper.exe')
  try {
    if (digest(await readFile(path)) === sha256) return { path, sha256 }
    throw new Error('桌面浮窗缓存校验失败')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const temporary = join(directory, `${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, bytes, { flag: 'wx' })
    try { await rename(temporary, path) }
    catch (error) {
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(error.code) || digest(await readFile(path)) !== sha256) throw error
    }
    if (digest(await readFile(path)) !== sha256) throw new Error('桌面浮窗缓存校验失败')
    return { path, sha256 }
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error }) }
}
