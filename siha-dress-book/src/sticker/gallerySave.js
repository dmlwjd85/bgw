// 사진·영상 갤러리 저장.
// 1) Capacitor 앱(네이티브): @capacitor/filesystem 로 임시 파일 → @capacitor-community/media 로 사진첩 '시하 스티커북' 앨범에 저장
//    (플러그인은 루트 package.json 에 있고 `npm run cap:sync` 로 네이티브에 들어감. 웹 번들은 import 하지 않고
//     window.Capacitor.Plugins 로만 찾으므로, 플러그인이 없으면 이 길은 건너뛰고 웹 빌드도 안 깨진다.)
// 2) 웹: navigator.canShare({ files }) 되면 공유 시트 → iOS '이미지/비디오 저장', 안드로이드 갤러리
// 3) 둘 다 안 되면 파일 내려받기
export const ALBUM = '시하 스티커북'

export function nativePlugins(env) {
  const cap = env?.Capacitor
  try {
    if (!cap?.isNativePlatform?.()) return null
  } catch { return null }
  const { Filesystem, Media } = cap.Plugins || {}
  return Filesystem && Media ? { Filesystem, Media, platform: cap.getPlatform?.() } : null
}

export function makeFile(blob, name, F = globalThis.File) {
  try { return new F([blob], name, { type: blob.type }) } catch { return null }
}

// 'native' | 'share' | 'download'
export function chooseSaveMethod(env, file) {
  if (nativePlugins(env)) return 'native'
  const nav = env?.navigator
  if (file && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try { if (nav.canShare({ files: [file] })) return 'share' } catch { /* 공유 안 됨 */ }
  }
  return 'download'
}

export function blobToBase64(blob) {
  return new Promise((ok, no) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1] || '')
    r.onerror = () => no(r.error)
    r.readAsDataURL(blob)
  })
}

async function albumId(Media, platform) {
  if (platform !== 'android') return undefined // iOS 는 앨범 없이도 사진첩에 저장(추가 전용 권한)
  const find = async () => ((await Media.getAlbums())?.albums || []).find((a) => a.name === ALBUM)?.identifier
  let id = await find()
  if (!id) { await Media.createAlbum({ name: ALBUM }); id = await find() }
  return id
}

export async function saveNative(p, blob, name, kind, toBase64 = blobToBase64) {
  const data = await toBase64(blob)
  const { uri } = await p.Filesystem.writeFile({ path: name, data, directory: 'CACHE' })
  const albumIdentifier = await albumId(p.Media, p.platform)
  const opt = { path: uri, albumIdentifier, fileName: name.replace(/\.[^.]+$/, '') }
  if (kind === 'video') await p.Media.saveVideo(opt)
  else await p.Media.savePhoto(opt)
  try { await p.Filesystem.deleteFile({ path: name, directory: 'CACHE' }) } catch { /* 임시 파일 */ }
}

export function download(blob, name, doc = globalThis.document, U = globalThis.URL) {
  const a = doc.createElement('a')
  a.download = name
  a.href = U.createObjectURL(blob)
  doc.body?.appendChild?.(a)
  a.click()
  a.remove?.()
  setTimeout(() => U.revokeObjectURL(a.href), 60000)
}

// 결과: { how: 'native'|'share'|'download', ok: true } 또는 { how: 'share', cancelled: true }
export async function saveToGallery(blob, name, kind = 'photo', env = globalThis, deps = {}) {
  const dl = deps.download || download
  const file = makeFile(blob, name, deps.File || env.File)
  let how = chooseSaveMethod(env, file)
  if (how === 'native') {
    try { await saveNative(nativePlugins(env), blob, name, kind, deps.toBase64); return { how, ok: true } } catch {
      how = chooseSaveMethod({ ...env, Capacitor: null }, file) // 권한 거절 등 → 웹 방식으로
    }
  }
  if (how === 'share') {
    try {
      await env.navigator.share({ files: [file], title: ALBUM })
      return { how, ok: true }
    } catch (e) {
      if (e?.name === 'AbortError') return { how, cancelled: true } // 아이가 공유 창을 닫음 → 아무것도 안 함
      // NotAllowedError(사용자 동작 만료) 등 → 내려받기
    }
  }
  dl(blob, name)
  return { how: 'download', ok: true }
}

export function savedMessage(res, kind) {
  const what = kind === 'video' ? '영상' : '사진'
  if (res.cancelled) return '저장을 그만뒀어요. 다시 눌러도 돼요!'
  if (res.how === 'native') return `사진첩에 ${what}을 넣었어요! 📸`
  if (res.how === 'share') return `${what}을 보냈어요! '저장'을 고르면 사진첩에 들어가요`
  return `${what}을 내려받았어요! 📥`
}
