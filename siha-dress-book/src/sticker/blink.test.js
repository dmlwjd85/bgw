import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { BLINK_MS, blinkFrameAt, blinkKeyframes, blinkLoopStart, blinkStarts, motionPlan } from './motion.js'
import { BRAG_MS } from './brag.js'
import { CHARACTER, LAYER_Z, blinkLayers, layersFor } from './model.js'

const PNG = (src) => { const b = readFileSync(new URL(`../../public/sticker/${src}`, import.meta.url)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }

describe('눈 깜빡임', () => {
  it('저장 영상 2초 안에 1~2번, 한 번은 120~150ms', () => {
    const s = blinkStarts(BRAG_MS)
    expect(s.length).toBeGreaterThanOrEqual(1)
    expect(s.length).toBeLessThanOrEqual(2)
    expect(BLINK_MS).toBeGreaterThanOrEqual(120)
    expect(BLINK_MS).toBeLessThanOrEqual(150)
    for (const b of s) {
      expect(b + BLINK_MS).toBeLessThanOrEqual(BRAG_MS)
      // 30fps 영상에서 감은 눈이 적어도 한 장 찍힌다
      const frames = Array.from({ length: 60 }, (_, i) => blinkFrameAt((i * 1000) / 30))
      expect(frames).toContain('closed')
      // 실제 감긴 시간
      let on = 0; for (let t = b; t < b + 200; t++) if (blinkFrameAt(t) !== 'open') on++
      expect(on).toBe(BLINK_MS)
    }
  })
  it('평소(뜬 눈)엔 겹침 없음, 움직임 줄이기면 안 깜빡임', () => {
    expect(blinkFrameAt(0)).toBe('open')
    expect(blinkFrameAt(500)).toBe('open')
    expect(blinkFrameAt(-5)).toBe('open')
    const s = blinkStarts(BRAG_MS)[0]
    expect(blinkFrameAt(s + 60)).toBe('closed')
    expect(blinkFrameAt(s + 60, motionPlan(true))).toBe('open')
  })
  it('2초 뒤에도 반복, WAAPI 키프레임이 blinkFrameAt 과 같다', () => {
    const L = blinkLoopStart()
    expect(blinkFrameAt(L + 60)).toBe('closed')
    const kf = blinkKeyframes('closed', 2000)
    const at = (t) => { let v = 0; for (const k of kf) if (k.offset * 2000 <= t) v = k.opacity; return v }
    for (let t = 0; t < 2000; t += 7) expect(at(t)).toBe(blinkFrameAt(t) === 'closed' ? 1 : 0)
  })
  it('겹침은 몸 바로 위·머리카락 아래, 몸 그림과 같은 4x 배율', () => {
    const layers = layersFor({}, [])
    const bl = blinkLayers(layers)
    expect(bl.map((l) => l.blink).sort()).toEqual(['closed', 'half'])
    const body = layers.find((l) => l.key === 'c-body')
    for (const l of bl) {
      expect(l.z).toBeGreaterThan(body.z)
      expect(l.z).toBeLessThan(LAYER_Z.hair)
      const { w, h } = PNG(l.p.src)
      expect([w, h]).toEqual([l.p.w * CHARACTER.res, l.p.h * CHARACTER.res])
      // 4x 몸 캔버스 정수 픽셀에 딱 맞음
      expect(((l.p.x - body.p.x) * CHARACTER.res) % 1).toBe(0)
      expect(((l.p.y - body.p.y) * CHARACTER.res) % 1).toBe(0)
    }
    expect(layersFor({}, []).some((l) => l.layer === 'blink')).toBe(false) // 사진 저장엔 안 들어감
  })
})
