// 배경 넘기기: 마지막 다음은 처음, 처음 이전은 마지막으로 돈다.
export function cycleIndex(i, dir, n) {
  if (!n) return 0
  const cur = Number.isInteger(i) && i >= 0 && i < n ? i : 0
  return (((cur + dir) % n) + n) % n
}
export function cycleId(list, id, dir) {
  if (!list.length) return id
  const i = list.findIndex((b) => b.id === id)
  return list[cycleIndex(i < 0 ? 0 : i, dir, list.length)].id
}
// 가로 스와이프 판정: 가로로 충분히 움직였고 세로보다 확실히 클 때만
export const SWIPE_MIN = 50
export function swipeDir(dx, dy, min = SWIPE_MIN) {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1 // 왼쪽으로 밀면 다음 배경
}
// 입력칸에 커서가 있으면 화살표 키를 가로채지 않음
export function isTypingTarget(el) {
  if (!el) return false
  const t = (el.tagName || '').toLowerCase()
  return t === 'input' || t === 'textarea' || t === 'select' || !!el.isContentEditable
}
