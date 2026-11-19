import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vueRoot = resolve(__dirname, '..')
const distDir = resolve(vueRoot, 'dist')
const repoRoot = resolve(vueRoot, '..')

const NATIVE_TARGETS = [
  resolve(repoRoot, 'native/android/app/src/main/assets/web'),
  resolve(repoRoot, 'native/ios/ios/web'),
  resolve(repoRoot, 'native/ohos/entry/src/main/resources/rawfile/web'),
  resolve(repoRoot, 'native/wechat-miniapp/miniprogram/web'),
]

// Metadata written after hashing — excluded so the version stays content-stable.
const META_FILES = new Set(['version.json', 'VERSION', 'webview.config.json'])

function walkFiles(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      files.push(...walkFiles(full))
    } else {
      files.push(full)
    }
  }
  return files
}

function contentHash(dir) {
  const files = walkFiles(dir)
    .filter((file) => !META_FILES.has(relative(dir, file).replaceAll('\\', '/')))
    .sort((a, b) => relative(dir, a).localeCompare(relative(dir, b), 'en'))

  if (files.length === 0) {
    throw new Error(`No build artifacts found in ${dir}`)
  }

  const hash = createHash('sha256')
  for (const file of files) {
    const rel = relative(dir, file).replaceAll('\\', '/')
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(file))
    hash.update('\0')
  }

  return {
    version: hash.digest('hex'),
    fileCount: files.length,
  }
}

function writeVersion(dir, version, fileCount) {
  const payload = {
    version,
    algorithm: 'sha256',
    fileCount,
    generatedAt: new Date().toISOString(),
  }
  writeFileSync(join(dir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`)
  writeFileSync(join(dir, 'VERSION'), `${version}\n`)

  // Shared remote WebView URL (configuration/webview.json) with vue/webview.config.json fallback.
  let origin = ''
  const sharedConfigPath = resolve(repoRoot, 'configuration/webview.json')
  const vueConfigPath = resolve(vueRoot, 'webview.config.json')
  if (existsSync(sharedConfigPath)) {
    try {
      const url = JSON.parse(readFileSync(sharedConfigPath, 'utf8')).url || ''
      origin = String(url).replace(/\/$/, '')
    } catch {
      origin = ''
    }
  }
  if (!origin && existsSync(vueConfigPath)) {
    try {
      origin = JSON.parse(readFileSync(vueConfigPath, 'utf8')).origin || ''
    } catch {
      origin = ''
    }
  }
  writeFileSync(
    join(dir, 'webview.config.json'),
    `${JSON.stringify({ origin, version }, null, 2)}\n`,
  )
}

function syncToNative(dir) {
  for (const target of NATIVE_TARGETS) {
    mkdirSync(dirname(target), { recursive: true })
    rmSync(target, { recursive: true, force: true })
    cpSync(dir, target, { recursive: true })
    console.log(`synced -> ${relative(repoRoot, target)}`)
  }
}

function main() {
  if (!existsSync(distDir)) {
    throw new Error(`Missing dist directory: ${distDir}. Run vite build first.`)
  }

  const { version, fileCount } = contentHash(distDir)
  writeVersion(distDir, version, fileCount)
  console.log(`web version (sha256): ${version}`)
  console.log(`hashed files: ${fileCount}`)

  syncToNative(distDir)
}

main()
