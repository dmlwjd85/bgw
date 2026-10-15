import { describe, expect, it } from 'vitest'
import { cycleIndex, cycleId, swipeDir, isTypingTarget } from './bgnav.js'
import { BACKGROUNDS } from './model.js'

describe('배경 넘기기 wrap', () => {
  it('다음/이전이 끝에서 돈다', () => {
    expect(cycleIndex(0, 1, 3)).toBe(1)
    expect(cycleIndex(2, 1, 3)).toBe(0)
    expect(cycleIndex(0, -1, 3)).toBe(2)
    expect(cycleIndex(1, -1, 3)).toBe(0)
  })
  it('잘못된 index·빈 목록·1개', () => {
    expect(cycleIndex(-1, 1, 3)).toBe(1)
    expect(cycleIndex(9, -1, 3)).toBe(2)
    expect(cycleIndex(0, 1, 0)).toBe(0)
    expect(cycleIndex(0, 1, 1)).toBe(0)
    expect(cycleIndex(0, -1, 1)).toBe(0)
  })
  it('실제 배경 목록: 마지막→처음, 처음→마지막, 한 바퀴', () => {
    const n = BACKGROUNDS.length
    const first = BACKGROUNDS[0].id, last = BACKGROUNDS[n - 1].id
    expect(cycleId(BACKGROUNDS, last, 1)).toBe(first)
    expect(cycleId(BACKGROUNDS, first, -1)).toBe(last)
    let id = first
    for (let k = 0; k < n; k++) id = cycleId(BACKGROUNDS, id, 1)
    expect(id).toBe(first)
    expect(cycleId(BACKGROUNDS, 'nope', 1)).toBe(BACKGROUNDS[1].id)
  })
  it('스와이프 판정', () => {
    expect(swipeDir(-80, 5)).toBe(1)
    expect(swipeDir(80, 5)).toBe(-1)
    expect(swipeDir(30, 0)).toBe(0)
    expect(swipeDir(60, 60)).toBe(0)
  })
  it('입력칸 판정', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
