import { describe, expect, it } from 'vitest'
import {
  CHARACTER,
  DEFAULT_ATTACH,
  LAYER_Z,
  PART,
  layersFor,
  nearestAnchor,
  normalizePart,
  resolvePiece,
  snapDrop,
  wear,
} from './model.js'

describe('normalizePart', () => {
  it('투명 PNG + 최소 설정만으로 부품을 만든다', () => {
    const part = normalizePart({
      id: 'cape_red',
      name: '빨간 망토',
      layer: 'outer',
      anchor: 'torso',
      scale: 1,
      hides: [],
      src: 'x4/cape_red.png',
    })
    expect(part.slot).toBe('outer')
    expect(part.anchor).toBe('torso')
    expect(part.pieces[0].src).toBe('x4/cape_red.png')
    expect(part.multi).toBe(false)
  })

  it('원피스는 상의·하의를 벗긴다', () => {
    const part = normalizePart({
      id: 'dress_x',
      layer: 'top',
      slot: 'dress',
      hides: ['top', 'bottom'],
      front: [{ src: 'x4/d.png', x: 0, y: 0, w: 10, h: 10 }],
    })
    expect(part.occlusion.clearsSlots).toEqual(['top', 'bottom'])
  })

  it('신발은 맨발을 숨긴다', () => {
    const part = normalizePart({
      id: 'shoes_x',
      layer: 'shoes',
      hides: ['feet'],
      front: [{ src: 'x4/s.png', x: 0, y: 0, w: 10, h: 10 }],
    })
    expect(part.occlusion.hideCharacterPieces).toEqual(['feet'])
  })
})

describe('wear', () => {
  it('원피스를 입으면 따로 입은 상의·하의를 벗긴다', () => {
    const next = wear({ top: 'top_yellow', bottom: 'skirt_navy' }, PART.dress_blue)
    expect(next.dress).toBe('dress_blue')
    expect(next.top).toBeUndefined()
    expect(next.bottom).toBeUndefined()
  })

  it('상의를 입으면 원피스를 벗긴다', () => {
    const next = wear({ dress: 'dress_blue' }, PART.top_yellow)
    expect(next.top).toBe('top_yellow')
    expect(next.dress).toBeUndefined()
  })
})

describe('snapDrop', () => {
  it('슬롯이 있는 옷은 스테이지 위에 놓으면 정해진 자리에 붙는다', () => {
    expect(snapDrop(PART.skirt_navy, 10, 10, true)).toEqual({ action: 'wear' })
  })

  it('스테이지 밖이면 버린다', () => {
    expect(snapDrop(PART.skirt_navy, 10, 10, false)).toEqual({ action: 'discard' })
  })

  it('장식은 가까운 앵커에 붙고, 멀면 그 자리에 남는다', () => {
    const near = snapDrop(PART.bow_pink, CHARACTER.anchors.crown.x, CHARACTER.anchors.crown.y, true)
    expect(near).toEqual({ action: 'anchor', anchor: 'crown' })
    const far = snapDrop(PART.bow_pink, 20, 400, true)
    expect(far).toEqual({ action: 'free', x: 20, y: 400 })
  })
})

describe('layersFor', () => {
  it('레이어 순서대로 그린다', () => {
    const layers = layersFor({ socks: 'socks_long', shoes: 'shoes_red', bottom: 'skirt_navy', top: 'top_yellow' }, [])
    const zs = layers.map((l) => l.z)
    expect(zs).toEqual([...zs].sort((a, b) => a - b))
    expect(LAYER_Z.socks).toBeLessThan(LAYER_Z.shoes)
    expect(LAYER_Z.shoes).toBeLessThan(LAYER_Z.bottom)
    expect(LAYER_Z.bottom).toBeLessThan(LAYER_Z.top)
  })

  it('신발을 신으면 맨발 조각을 가린 그림으로 바꾼다', () => {
    const layers = layersFor({ shoes: 'shoes_red' }, [])
    const feet = layers.find((l) => l.key === 'c-feet')
    expect(feet.p.src).toBe('x4/siha-feet-shoes_red.png')
  })

  it('곰 우주복은 신발·양말을 덮고 맨발·흔드는 팔을 숨긴다', () => {
    const layers = layersFor({ dress: 'onesie_bear', shoes: 'shoes_red', socks: 'socks_long' }, [])
    expect(layers.some((l) => l.partId === 'shoes_red')).toBe(false)
    expect(layers.some((l) => l.partId === 'socks_long')).toBe(false)
    expect(layers.some((l) => l.key === 'c-feet')).toBe(false)
    expect(layers.some((l) => l.key === 'c-arm_wave')).toBe(false)
    expect(layers.some((l) => l.partId === 'onesie_bear')).toBe(true)
  })

  it('시하 조각에 뒷머리·얼굴·앞머리·흔드는 팔이 있다', () => {
    const keys = CHARACTER.pieces.map((p) => p.key)
    expect(keys).toEqual(expect.arrayContaining(['back_hair', 'body', 'feet', 'arm_wave', 'face', 'front_hair']))
  })

  it('하늘 드레스는 흔드는 맨팔을 가린다', () => {
    const layers = layersFor({ dress: 'dress_blue' }, [])
    expect(layers.some((l) => l.key === 'c-arm_wave')).toBe(false)
    expect(PART.dress_blue.occlusion.hideCharacterPieces).toContain('arm_wave')
  })

  it('밀짚모자는 뒤 조각이 뒷머리 레이어에 있고 미리보기는 그리지 않는다', () => {
    const back = PART.hat_straw.pieces.filter((p) => p.layer === 'back_hair' && !p.preview)
    expect(back.length).toBeGreaterThan(0)
    const layers = layersFor({ head: 'hat_straw' }, [])
    expect(layers.some((l) => l.p.preview)).toBe(false)
    expect(layers.some((l) => (l.p.src || '').includes('hat_straw-0'))).toBe(false)
    expect(layers.some((l) => (l.p.src || '').includes('hat_straw-back'))).toBe(true)
  })
})

describe('resolvePiece', () => {
  it('좌표가 없으면 캐릭터 앵커에 맞춰 놓는다', () => {
    const part = normalizePart({
      id: 'hat_x',
      layer: 'hair_acc',
      anchor: 'head',
      scale: 1,
      src: 'x4/hat.png',
    })
    const placed = resolvePiece(part, part.pieces[0], { 'x4/hat.png': { w: 80, h: 40 } })
    const at = DEFAULT_ATTACH.hair_acc
    expect(placed.w).toBe(80)
    expect(placed.x).toBeCloseTo(CHARACTER.anchors.head.x - 80 * at.x)
    expect(placed.y).toBeCloseTo(CHARACTER.anchors.head.y - 40 * at.y)
  })
})

describe('nearestAnchor', () => {
  it('허용된 앵커 중 가장 가까운 것만 고른다', () => {
    expect(nearestAnchor(PART.lollipop, CHARACTER.anchors.hand.x, CHARACTER.anchors.hand.y)).toBe('hand')
    expect(nearestAnchor(PART.lollipop, CHARACTER.anchors.crown.x, CHARACTER.anchors.crown.y)).toBeNull()
  })
})
