import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build on Windows x64')
if (manifest.name !== 'dsh-session-todo-desktop2') throw new Error('Unexpected package identity')
const framework = join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319')
const csc = join(framework, 'csc.exe')
if (!existsSync(csc)) throw new Error('.NET Framework 4 C# compiler is required')
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`)
}
const sources = ['Program', 'CompactView', 'DarkMenu', 'Foreground', 'GroupTabs', 'InlineTitle']
run(csc, [
  '/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/debug-', '/codepage:65001',
  `/out:${join(root, 'helper', 'dsh-session-todo-helper-v4.exe')}`,
  `/lib:${join(framework, 'WPF')}`,
  ...['PresentationFramework', 'PresentationCore', 'WindowsBase', 'System.Xaml', 'System.Web.Extensions', 'System'].map(name => `/reference:${name}.dll`),
  ...sources.map(name => join(root, 'helper', `${name}.cs`)),
])
const files = ['package.json', ...manifest.files.filter(file => file !== 'build-info.json')]
const hashes = {}
for (const file of files) {
  if (file.endsWith('.js')) run(process.execPath, ['--check', join(root, file)])
  const bytes = await readFile(join(root, file))
  hashes[file] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}
await writeFile(join(root, 'build-info.json'), JSON.stringify({
  package: manifest.name, version: manifest.version,
  builtAt: new Date().toISOString(), platform: 'windows-x64', files: hashes,
}, null, 2) + '\n')
const dist = join(root, 'dist', manifest.name)
await mkdir(dist, { recursive: true })
for (const file of [...files, 'build-info.json']) {
  const target = join(dist, file)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(join(root, file), target)
}
const releases = join(root, 'releases')
await mkdir(releases, { recursive: true })
const archiveName = `dsh-session-todo-${manifest.version}-windows-x64.zip`
// Pass paths through the environment, without interpolating them into shell code.
run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  `$ErrorActionPreference = 'Stop'
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $stream = [IO.File]::Open($env:DSH_TODO_ARCHIVE, [IO.FileMode]::Create)
  $zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($relative in (ConvertFrom-Json $env:DSH_TODO_FILES)) {
      $source = Join-Path $env:DSH_TODO_BUNDLE $relative
      $entry = $env:DSH_TODO_NAME + '/' + $relative
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $zip.Dispose(); $stream.Dispose() }`],
  { env: { ...process.env, DSH_TODO_BUNDLE: dist, DSH_TODO_ARCHIVE: join(releases, archiveName),
    DSH_TODO_NAME: manifest.name, DSH_TODO_FILES: JSON.stringify([...files, 'build-info.json']) } })
await copyFile(join(root, 'AI_INSTALL.md'), join(releases, 'AI_INSTALL.md'))
const sums = []
for (const file of [archiveName, 'AI_INSTALL.md']) {
  sums.push(`${createHash('sha256').update(await readFile(join(releases, file))).digest('hex')}  ${file}`)
}
await writeFile(join(releases, 'SHA256SUMS.txt'), sums.join('\n') + '\n')
console.log(`Built ${manifest.name}@${manifest.version}: releases/${archiveName}`)
