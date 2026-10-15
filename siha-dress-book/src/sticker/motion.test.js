import { describe, expect, it } from 'vitest'
import LAYERS from './data/layers.json'
import { MOTION_TYPES, SAVE_HOP_MS, characterPoseAt, keyframesFor, motionFor, motionPlan, normalizeType, parseMotionConfig, pickVideoMime, poseAt, prefersReducedMotion, savePoseAt } from './motion.js'
import { layersFor, CHARACTER } from './model.js'

describe('parseMotionConfig', () => {
  it('layers.json 의 motion 을 읽는다', () => {
    const c = parseMotionConfig(LAYERS)
    expect(c.character).toBe('breathe')
    expect(c.byLayer).toMatchObject({ back_hair: 'sway', front_hair: 'sway-late', hair_acc: 'bob', pet: 'hop', glitter: 'pulse', shadow: 'pulse', body: 'none' })
    expect(c.byLayer._note).toBeUndefined()
  })
  it('모르는 값은 무시, 별칭·대소문자·객체 형식 허용', () => {
    const c = parseMotionConfig({ motion: { pet: 'JUMP', hair_acc: { type: 'float' }, top: 'wiggle', character: 'nope', front_hair: 'sway-delayed' } })
    expect(c.byLayer).toEqual({ pet: 'hop', hair_acc: 'bob', front_hair: 'sway-late', body: 'none' })
    expect(c.character).toBe('none')
  })
  it('motion 이 없거나 이상해도 안전', () => {
    expect(parseMotionConfig(undefined)).toEqual({ character: 'none', byLayer: { body: 'none' } })
    expect(parseMotionConfig({ motion: 'x' }).byLayer).toEqual({ body: 'none' })
  })
  it('몸은 설정으로도 혼자 못 움직인다', () => {
    const c = parseMotionConfig({ motion: { body: 'hop' } })
    expect(c.byLayer.body).toBe('none')
    expect(motionFor(c, 'body', 'hop')).toBe('none')
  })
  it('부품 motion 이 레이어 기본값보다 먼저, 없으면 none', () => {
    const c = parseMotionConfig(LAYERS)
    expect(motionFor(c, 'pet')).toBe('hop')
    expect(motionFor(c, 'pet', 'bob')).toBe('bob')
    expect(motionFor(c, 'top')).toBe('none')
    expect(motionFor(c, 'top', 'bogus')).toBe('none')
  })
  it('normalizeType', () => {
    expect(MOTION_TYPES.every((t) => normalizeType(t) === t)).toBe(true)
    expect(normalizeType(null)).toBe(null)
  })
  it('새 부품은 layer 만 있어도 자동으로 움직임 정보가 붙는다', () => {
    const c = parseMotionConfig(LAYERS)
    const ls = layersFor({ pet: 'pet_corgi' }, [], {})
    const pet = ls.find((l) => l.partId === 'pet_corgi')
    if (pet) expect(motionFor(c, pet.layer, pet.motion)).toBe('hop')
    const body = ls.find((l) => l.key === 'c-body')
    expect(body.layer).toBe('body')
    expect(motionFor(c, body.layer, body.motion)).toBe('none')
  })
})

describe('reduced motion', () => {
  it('줄이기 켜면 뛰기·계속 움직임·진동 없음, 빛은 제자리 페이드', () => {
    expect(motionPlan(true)).toEqual({ level: 'minimal', hop: false, idle: false, shimmer: 'fade', vibrate: false })
    expect(motionPlan(false)).toMatchObject({ level: 'full', hop: true, idle: true, shimmer: 'sweep' })
  })
  it('줄이기면 캐릭터는 늘 제자리', () => {
    const plan = motionPlan(true)
    for (const t of [0, 200, 500, 1500, 5000]) expect(characterPoseAt('breathe', t, plan)).toMatchObject({ tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 })
  })
  it('prefersReducedMotion 은 matchMedia 를 따른다', () => {
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: true }) })).toBe(true)
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: false }) })).toBe(false)
    expect(prefersReducedMotion({})).toBe(false)
    expect(prefersReducedMotion({ matchMedia: () => { throw new Error('x') } })).toBe(false)
  })
})

describe('poses', () => {
  it('저장 뛰기는 위로 뛰었다가 제자리로', () => {
    expect(savePoseAt(0)).toMatchObject({ ty: 0, sx: 1, sy: 1 })
    expect(savePoseAt(SAVE_HOP_MS * 0.42).ty).toBeLessThan(-20)
    expect(savePoseAt(SAVE_HOP_MS)).toMatchObject({ ty: 0, sx: 1, sy: 1 })
  })
  it('앞머리는 뒷머리보다 살짝 늦게 흔들린다', () => {
    expect(poseAt('sway', 0).rot).toBeCloseTo(0)
    expect(poseAt('sway-late', 260).rot).toBeCloseTo(0)
    expect(poseAt('sway-late', 0).rot).toBeLessThan(0)
  })
  it('키프레임은 반복이 이어지게 처음=끝', () => {
    for (const t of ['breathe', 'sway', 'sway-late', 'bob', 'hop', 'pulse']) {
      const kf = keyframesFor(t, { w: 100, h: 100 })
      expect(kf[0].transform).toBe(kf.at(-1).transform)
    }
  })
  it('몸 그림 좌표·크기는 그대로', () => {
    expect(CHARACTER.pieces.find((p) => p.key === 'body')).toMatchObject({ x: 30, y: 40, w: 300, h: 570 })
  })
})

describe('pickVideoMime', () => {
  it('mp4 먼저, 없으면 webm, 둘 다 없으면 null', () => {
    expect(pickVideoMime((m) => m.startsWith('video/mp4'))).toMatch(/^video\/mp4/)
    expect(pickVideoMime((m) => m === 'video/webm;codecs=vp9')).toBe('video/webm;codecs=vp9')
    expect(pickVideoMime(() => false)).toBe(null)
  })
})
