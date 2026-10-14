import { describe, expect, it } from 'vitest'
import {
  BACKGROUNDS,
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
    const next = wear({ top: 'top_yellow', bottom: 'skirt_navy' }, PART.dress_idol_star)
    expect(next.dress).toBe('dress_idol_star')
    expect(next.top).toBeUndefined()
    expect(next.bottom).toBeUndefined()
  })

  it('상의를 입으면 원피스를 벗긴다', () => {
    const next = wear({ dress: 'dress_idol_star' }, PART.top_yellow)
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
    const layers = layersFor({ shoes: 'shoes_red', bottom: 'skirt_navy', top: 'top_yellow' }, [])
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

  it('신발이 맨발을 숨기면 발 조각을 그리지 않는다', () => {
    const layers = layersFor({ shoes: 'shoes_idol_platform' }, [])
    expect(layers.some((l) => l.key === 'c-feet')).toBe(false)
    expect(layers.some((l) => l.partId === 'shoes_idol_platform')).toBe(true)
  })

  it('시하 조각은 원본 몸·발 한 장이다', () => {
    expect(CHARACTER.pieces.map((p) => p.key)).toEqual(['body', 'feet'])
  })

  it('코드로 그린 옛 원피스·우주복은 카탈로그에 없다', () => {
    expect(PART.dress_blue).toBeUndefined()
    expect(PART.dress_pink).toBeUndefined()
    expect(PART.onesie_bear).toBeUndefined()
  })

  it('옷 PNG에는 원본 시트에서 떼 온 손·발 이음이 없다', () => {
    for (const p of Object.values(PART)) {
      expect(p.pieces.every((pc) => !(pc.src || '').includes('-hand'))).toBe(true)
      expect(p.pieces.every((pc) => (pc.layer || p.layer) !== 'arms')).toBe(true)
    }
  })

  it('밀짚모자는 원본 한 장을 머리장식 레이어에 그린다', () => {
    const layers = layersFor({ head: 'hat_straw' }, [])
    expect(layers.some((l) => (l.p.src || '').includes('hat_straw-0'))).toBe(true)
    expect(layers.some((l) => (l.p.src || '').includes('hat_straw-back'))).toBe(false)
    expect(PART.hat_straw.pieces.every((p) => !p.preview)).toBe(true)
  })

  it('코드로 자른 소매·앞뒤 조각과 그려 넣은 옛 양말은 카탈로그에 없다', () => {
    expect(PART.socks_long).toBeUndefined()
    expect(PART.socks_short).toBeUndefined()
    expect(PART.top_yellow.pieces.every((p) => !(p.src || '').includes('sleeve'))).toBe(true)
    expect(PART.hat_straw.pieces.every((p) => !(p.src || '').includes('-front') && !(p.src || '').includes('-back'))).toBe(true)
  })

  it('트레이 탭마다 새로 넣은 옷이 있고, 소품에는 마이크가 여러 개다', () => {
    const byCat = {}
    for (const p of Object.values(PART)) {
      byCat[p.category] = (byCat[p.category] || 0) + 1
    }
    for (const cat of ['dress', 'top', 'bottom', 'socks', 'shoes', 'head', 'ribbon', 'flower', 'neck', 'charm']) {
      expect(byCat[cat], cat).toBeGreaterThanOrEqual(5)
    }
    expect(['mic_handheld', 'mic_headset', 'mic_stand'].every((id) => PART[id])).toBe(true)
    expect(PART.bag_tote).toBeTruthy()
    expect(BACKGROUNDS.some((b) => b.id === 'concert_purple')).toBe(true)
    expect(BACKGROUNDS.some((b) => b.id === 'concert_gold')).toBe(true)
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
