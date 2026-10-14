/**
 * Vite 산출물(siha-dress-book/dist)을 Capacitor webDir(siha/)로 복사한다.
 * 커밋된 아이콘·개인정보 페이지는 지우지 않는다.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'siha-dress-book/dist')
const dest = join(root, 'siha')
const keep = new Set(['icons', 'privacy.html'])

if (!existsSync(src)) {
  console.error('siha-dress-book/dist 가 없습니다. 먼저 웹 앱을 빌드하세요.')
  process.exit(1)
}

mkdirSync(dest, { recursive: true })
for (const name of readdirSync(dest)) {
  if (keep.has(name)) continue
  rmSync(join(dest, name), { recursive: true, force: true })
}
for (const name of readdirSync(src)) {
  cpSync(join(src, name), join(dest, name), { recursive: true })
}

console.log(`Capacitor webDir 동기화: ${src} → ${dest}`)
