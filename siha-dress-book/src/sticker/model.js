// 데이터 읽기 + 레이어 계산. 부품 1개 = data/parts/<id>.json 1개, 캐릭터 = data/characters/<id>.json.
import LAYERS from './data/layers.json'
import SIHA from './data/characters/siha.json'

const partFiles = import.meta.glob('./data/parts/*.json', { eager: true, import: 'default' })
const bgFiles = import.meta.glob('./data/backgrounds/*.json', { eager: true, import: 'default' })

export const CHARACTER = SIHA
export const STAGE = SIHA.stage
export const LAYER_Z = Object.fromEntries(LAYERS.order.map((id, i) => [id, (i + 1) * 100]))
export const CATEGORIES = LAYERS.categories
const all = Object.values(partFiles)
const rank = (id) => { const i = LAYERS.partOrder.indexOf(id); return i < 0 ? 999 : i }
// 검토 미통과 부품: 옛 몸용이라 파일이 남아 있어도 트레이·착용에서 숨김
const HIDDEN_IDS = new Set([
  'dress_summer', 'onesie_bunny', 'dress_princess', 'dress_spring', 'coat_winter', 'tutu_ballet',
  'shoes_sneaker_mint', 'shoes_sneaker_blue', 'shoes_slipper_bunny', 'shoes_hightop_purple',
  'shoes_balletflat_pink', 'shoes_rainboot_yellow',
  'socks_ankle_stripe', 'socks_crew_blue', 'socks_knee_navy', 'socks_frill_lavender', 'socks_holiday',
])
export const PARTS = all.filter((p) => !HIDDEN_IDS.has(p.id)).sort((a, b) => rank(a.id) - rank(b.id))
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]))
// 트레이 썸네일: 조건부·기워 넣기 조각은 빼고, 본편 레이어를 우선(머리처럼 모든 조각에 layer가 있는 경우)
export function thumbPieces(part) {
  // onlyWith는 다른 부품을 입었을 때만 쓰는 대체 그림이라 빼고, 기본 모습(unlessWith 포함)은 남긴다
  const base = part.pieces.filter((pc) => !pc.onlyWith && !pc.patch)
  const main = base.filter((pc) => !pc.layer || pc.layer === part.layer)
  return (main.length ? main : base).slice(0, 2)
}
// 기본 배경(저장값 없는 사용자)은 모눈종이(grid_blue). 나머지는 id 순.
export const DEFAULT_BG = 'grid_blue'
export const BACKGROUNDS = Object.values(bgFiles).sort((a, b) =>
  (a.id === DEFAULT_BG ? -1 : b.id === DEFAULT_BG ? 1 : a.id.localeCompare(b.id)))

// 예전 저장본(v1)의 id → 새 id
const RENAMED = { tiara_blue: 'devil_horns', bow_pink_side: 'bow_pink_small', ribbon: 'ribbon_pink', bluebow: 'bow_blue_gem' }
export const fixId = (id) => RENAMED[id] || id

export function wear(worn, part) {
  const next = { ...worn }
  for (const s of part.occlusion?.clearsSlots || []) delete next[s]
  for (const [slot, id] of Object.entries(next)) {
    if ((PART[id]?.occlusion?.clearsSlots || []).includes(part.slot)) delete next[slot]
  }
  next[part.slot] = part.id
  return next
}

// 캐릭터 기본 부품(예: 민머리 몸 + hair_long_default). 그 슬롯이 비어 있을 때만 채움(저장값에는 넣지 않음)
export function withDefaults(worn) {
  const w = { ...worn }
  for (const [slot, id] of Object.entries(CHARACTER.defaultParts || {})) {
    if (!w[slot] && PART[id]) w[slot] = id
  }
  return w
}

// 부품 단위 앵커(예: 신발 anchor "feet"): 캐릭터 앵커의 dx/dy만큼 조각 전체를 옮김(없으면 0)
const anchorShift = (part) => {
  const a = part.anchor && CHARACTER.anchors?.[part.anchor]
  return { dx: (a && a.dx) || 0, dy: (a && a.dy) || 0 }
}
const zOf = (layer) => LAYER_Z[layer] ?? LAYER_Z.top

// 화면에 그릴 조각 목록 (z 오름차순)
export function layersFor(wornIn, accs, pos = {}) {
  const worn = withDefaults(wornIn)
  const off = (slot) => pos[slot] || { dx: 0, dy: 0 }
  const moved = (slot) => { const o = off(slot); return Boolean(o.dx || o.dy) }
  const all = Object.values(worn).map((id) => PART[id]).filter(Boolean)
  // 덮는 옷(예: 곰 우주복 발)이 가리는 슬롯은 그리지 않음(입은 정보는 그대로 둠)
  const hideSlots = new Set(all.flatMap((p) => p.occlusion?.hideSlots || []))
  const parts = all.filter((p) => !hideSlots.has(p.slot))
  const hidden = new Set(parts.flatMap((p) => p.occlusion?.hideCharacterPieces || []))
  const has = (slot) => !hideSlots.has(slot) && Boolean(worn[slot] && PART[worn[slot]])
  const out = []
  // 신발을 원래 자리에서 옮기면 발 가림(맞춤 발 조각)은 쓰지 않음 → 맨발이 그대로 보임
  const replaced = Object.assign({}, ...parts.filter((p) => !moved(p.slot)).map((p) => p.occlusion?.replaceCharacterPieces || {}))
  const shoesFit = has('shoes') && !moved('shoes')
  CHARACTER.pieces.forEach((p, i) => {
    if (hidden.has(p.key)) return
    const q = replaced[p.key] ? { ...p, src: replaced[p.key] } : p
    out.push({ key: `c-${p.key}`, z: zOf(p.layer) + i, p: q })
  })
  const ids = Object.values(worn)
  parts.forEach((part) => {
    const sh = anchorShift(part)
    part.pieces.forEach((pc, i) => {
      const fitted = !moved(part.slot) && shoesFit   // 신발·양말 맞춤 조각은 둘 다 제자리일 때만
      if (pc.onlyWith && (!ids.includes(pc.onlyWith) || (PART[pc.onlyWith]?.slot === 'shoes' && !fitted))) return
      if (pc.unlessWith && ids.includes(pc.unlessWith)) return
      if (pc.unlessSlot && has(pc.unlessSlot) && (pc.unlessSlot !== 'shoes' || fitted)) return
      const alt0 = pc.alt && has(pc.alt.when) ? { ...pc, ...pc.alt } : pc
      const o = off(part.slot)
      const alt = { ...alt0, x: alt0.x + (sh.dx || 0) + o.dx, y: alt0.y + (sh.dy || 0) + o.dy }
      out.push({ key: `${part.id}-${i}`, z: zOf(pc.layer || part.layer) + 10 + i, p: alt, partId: part.id })
    })
  })
  accs.forEach((a, i) => {
    const part = PART[a.id]
    if (!part) return
    const box = accBox(a)
    const layer = a.layer || (a.anchor ? CHARACTER.anchors[a.anchor].layer : 'hand_prop')
    out.push({ key: `acc-${a.uid}`, z: zOf(layer) + 50 + i, p: { src: part.pieces[0].src, ...box }, accUid: a.uid })
  })
  return out.sort((a, b) => a.z - b.z)
}

export function accBox(a) {
  const part = PART[a.id]
  const anc = a.anchor && CHARACTER.anchors[a.anchor]
  const free = a.size != null   // v3: 놓은 자리(x,y=가운데) 그대로, 크기는 저장된 값
  const k = free ? a.size : anc ? anc.size : 0.6
  const w = part.size.w * k
  const h = part.size.h * k
  const off = (!free && anc && part.anchorOffset && part.anchorOffset[a.anchor]) || {}
  const cx = !free && anc ? anc.x + (off.dx || 0) : a.x
  const cy = !free && anc ? anc.y + (off.dy || 0) : a.y
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function nearestAnchor(part, x, y, radius = 70) {
  let best = null
  for (const id of part.anchors || []) {
    const a = CHARACTER.anchors[id]
    const d = Math.hypot(a.x - x, a.y - y)
    if (d < radius && (!best || d < best.d)) best = { id, d }
  }
  return best?.id || null
}
