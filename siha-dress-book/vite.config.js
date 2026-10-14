import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

function listFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...listFiles(p))
    else out.push(p)
  }
  return out
}

// 커밋된 siha/icons · siha/privacy.html 을 Vite public 으로 복사해 개발·빌드에 쓴다.
function copySihaShellToPublic() {
  const publicDir = join(here, 'public')
  cpSync(join(repoRoot, 'siha/icons'), join(publicDir, 'icons'), { recursive: true })
  copyFileSync(join(repoRoot, 'siha/privacy.html'), join(publicDir, 'privacy.html'))
}

function sihaPwaPlugin() {
  return {
    name: 'siha-pwa',
    buildStart() {
      copySihaShellToPublic()
    },
    configureServer() {
      copySihaShellToPublic()
    },
    closeBundle() {
      const dist = join(here, 'dist')
      if (!existsSync(join(dist, 'sw.js'))) return

      const rels = listFiles(dist)
        .map((p) => relative(dist, p).split('\\').join('/'))
        .filter((r) => r !== 'sw.js' && !r.endsWith('.map'))
        .sort()
      const fingerprint = rels.map((r) => `${r}:${statSync(join(dist, r)).size}`).join('|')
      const version = `siha-stickerbook-v${createHash('sha256').update(fingerprint).digest('hex').slice(0, 10)}`
      const urls = ['./', ...rels.map((r) => `./${r}`)]

      let sw = readFileSync(join(dist, 'sw.js'), 'utf8')
      sw = sw.replace("'__SIHA_CACHE_VERSION__'", JSON.stringify(version))
      sw = sw.replace("['__SIHA_PRECACHE__']", JSON.stringify(urls))
      writeFileSync(join(dist, 'sw.js'), sw)
      console.log(`[siha-pwa] ${version}  precache ${urls.length} urls`)
    },
  }
}

// base './' : GitHub Pages 하위 경로 /bgw/siha/ 와 Capacitor 파일 루트 모두에서 상대 경로가 동작한다.
export default defineConfig({
  plugins: [react(), sihaPwaPlugin()],
  base: './',
  server: { port: 5178, strictPort: true },
})
