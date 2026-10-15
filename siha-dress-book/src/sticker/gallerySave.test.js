import { describe, expect, it, vi } from 'vitest'
import { chooseSaveMethod, nativePlugins, saveNative, saveToGallery, savedMessage } from './gallerySave.js'

class F { constructor(parts, name, o) { this.name = name; this.type = o.type } }
const blob = { type: 'image/png', size: 3 }
const shareEnv = (canShare = true, share = vi.fn(async () => {})) => ({ navigator: { canShare: vi.fn(() => canShare), share }, File: F })
const cap = (Media, Filesystem, platform = 'ios') => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => platform, Plugins: { Media, Filesystem } }, File: F })

describe('chooseSaveMethod', () => {
  it('공유 가능하면 share', () => expect(chooseSaveMethod(shareEnv(true), new F([], 'a.png', blob))).toBe('share'))
  it('canShare 가 files 를 거부하면 download', () => expect(chooseSaveMethod(shareEnv(false), new F([], 'a.png', blob))).toBe('download'))
  it('share/canShare 가 없으면 download', () => {
    expect(chooseSaveMethod({ navigator: { share: () => {} } }, {})).toBe('download')
    expect(chooseSaveMethod({ navigator: {} }, {})).toBe('download')
    expect(chooseSaveMethod({}, null)).toBe('download')
  })
  it('canShare 가 던져도 download', () => expect(chooseSaveMethod({ navigator: { share() {}, canShare() { throw new Error('x') } } }, {})).toBe('download'))
  it('Capacitor 네이티브 + 플러그인 있으면 native', () => expect(chooseSaveMethod(cap({}, {}), {})).toBe('native'))
  it('Capacitor 웹이거나 플러그인 없으면 native 아님', () => {
    expect(nativePlugins({ Capacitor: { isNativePlatform: () => false, Plugins: { Media: {}, Filesystem: {} } } })).toBe(null)
    expect(nativePlugins({ Capacitor: { isNativePlatform: () => true, Plugins: {} } })).toBe(null)
    expect(chooseSaveMethod({ ...shareEnv(true), Capacitor: { isNativePlatform: () => true, Plugins: {} } }, {})).toBe('share')
  })
})

describe('saveToGallery', () => {
  it('share 성공', async () => {
    const env = shareEnv(true); const dl = vi.fn()
    expect(await saveToGallery(blob, 'a.png', 'photo', env, { download: dl })).toEqual({ how: 'share', ok: true })
    expect(env.navigator.share.mock.calls[0][0].files[0].name).toBe('a.png')
    expect(dl).not.toHaveBeenCalled()
  })
  it('공유 창 닫음(AbortError)은 내려받지 않음', async () => {
    const dl = vi.fn(); const env = shareEnv(true, vi.fn(async () => { throw Object.assign(new Error(), { name: 'AbortError' }) }))
    expect(await saveToGallery(blob, 'a.png', 'photo', env, { download: dl })).toEqual({ how: 'share', cancelled: true })
    expect(dl).not.toHaveBeenCalled()
  })
  it('공유 실패(NotAllowedError)면 내려받기로', async () => {
    const dl = vi.fn(); const env = shareEnv(true, vi.fn(async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }) }))
    expect(await saveToGallery(blob, 'v.mp4', 'video', env, { download: dl })).toEqual({ how: 'download', ok: true })
    expect(dl).toHaveBeenCalledWith(blob, 'v.mp4')
  })
  it('공유 불가면 바로 내려받기', async () => {
    const dl = vi.fn()
    expect(await saveToGallery(blob, 'a.png', 'photo', shareEnv(false), { download: dl })).toEqual({ how: 'download', ok: true })
    expect(dl).toHaveBeenCalledOnce()
  })
  it('네이티브: 파일 쓰고 영상은 saveVideo, 안드로이드는 앨범 만들어서', async () => {
    const albums = []
    const Media = { getAlbums: vi.fn(async () => ({ albums })), createAlbum: vi.fn(async ({ name }) => { albums.push({ name, identifier: 'alb1' }) }), saveVideo: vi.fn(async () => ({})), savePhoto: vi.fn() }
    const Filesystem = { writeFile: vi.fn(async () => ({ uri: 'file:///c/v.mp4' })), deleteFile: vi.fn(async () => {}) }
    const res = await saveToGallery(blob, 'v.mp4', 'video', cap(Media, Filesystem, 'android'), { toBase64: async () => 'QUJD', download: vi.fn() })
    expect(res).toEqual({ how: 'native', ok: true })
    expect(Filesystem.writeFile).toHaveBeenCalledWith({ path: 'v.mp4', data: 'QUJD', directory: 'CACHE' })
    expect(Media.saveVideo).toHaveBeenCalledWith({ path: 'file:///c/v.mp4', albumIdentifier: 'alb1', fileName: 'v' })
    expect(Media.savePhoto).not.toHaveBeenCalled()
  })
  it('네이티브 iOS 사진은 앨범 없이 savePhoto', async () => {
    const Media = { getAlbums: vi.fn(), savePhoto: vi.fn(async () => ({})) }
    const Filesystem = { writeFile: async () => ({ uri: 'file:///a.png' }), deleteFile: async () => {} }
    await saveNative({ Media, Filesystem, platform: 'ios' }, blob, 'a.png', 'photo', async () => 'x')
    expect(Media.savePhoto).toHaveBeenCalledWith({ path: 'file:///a.png', albumIdentifier: undefined, fileName: 'a' })
    expect(Media.getAlbums).not.toHaveBeenCalled()
  })
  it('네이티브 실패(권한 거절)면 공유 → 내려받기로', async () => {
    const Media = { savePhoto: vi.fn(async () => { throw new Error('denied') }) }
    const Filesystem = { writeFile: async () => ({ uri: 'u' }) }
    const dl = vi.fn()
    const env = { ...cap(Media, Filesystem), navigator: {} }
    expect(await saveToGallery(blob, 'a.png', 'photo', env, { toBase64: async () => 'x', download: dl })).toEqual({ how: 'download', ok: true })
    expect(dl).toHaveBeenCalledOnce()
  })
  it('안내 문구', () => {
    expect(savedMessage({ how: 'native' }, 'video')).toContain('영상')
    expect(savedMessage({ cancelled: true }, 'photo')).toContain('다시')
    expect(savedMessage({ how: 'download' }, 'photo')).toContain('사진')
  })
})
