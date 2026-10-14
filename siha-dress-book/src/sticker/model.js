// 데이터 읽기 + 레이어·스냅·가림 계산.
// 부품 1개 = data/parts/<id>.json 1개, 캐릭터 = data/characters/<id>.json.
import LAYERS from './data/layers.json'
import SIHA from './data/characters/siha.json'

const partFiles = import.meta.glob('./data/parts/*.json', { eager: true, import: 'default' })
const bgFiles = import.meta.glob('./data/backgrounds/*.json', { eager: true, import: 'default' })

export const CHARACTER = SIHA
export const STAGE = SIHA.stage
export const LAYER_Z = Object.fromEntries(LAYERS.order.map((id, i) => [id, (i + 1) * 100]))
export const CATEGORIES = LAYERS.categories
export const SNAP_RADIUS = 70 // 자유 장식: 이 거리(스테이지 px) 안이면 가까운 앵커에 붙음

const CHAR_PIECE_KEYS = new Set((CHARACTER.pieces || []).map((p) => p.key))
const SLOT_IDS = new Set(LAYERS.slots || ['dress', 'top', 'bottom', 'socks', 'shoes', 'head', 'neck'])

// 레이어별 기본 부착점 (이미지 안 비율). 새 부품에 x/y 가 없을 때 앵커와 맞출 위치.
export const DEFAULT_ATTACH = {
  back_hair: { x: 0.5, y: 0.5 },
  body: { x: 0.5, y: 0.5 },
  underwear: { x: 0.5, y: 0.05 },
  socks: { x: 0.5, y: 0 },
  shoes: { x: 0.5, y: 0.2 },
  bottom: { x: 0.5, y: 0.05 },
  top: { x: 0.5, y: 0.15 },
  outer: { x: 0.5, y: 0.12 },
  arms: { x: 0.5, y: 0.5 },
  face: { x: 0.5, y: 0.5 },
  front_hair: { x: 0.5, y: 0.35 },
  hair_acc: { x: 0.5, y: 0.65 },
  hand_prop: { x: 0.5, y: 0.5 },
}

const SLOT_ANCHOR = {
  dress: 'torso',
  top: 'torso',
  bottom: 'waist',
  socks: 'legs',
  shoes: 'feet',
  head: 'head',
  neck: 'neck',
}

function flattenPieces(raw) {
  if (Array.isArray(raw.pieces) && raw.pieces.length && !raw.front && !raw.back && !raw.connectors && !raw.src) {
    return raw.pieces
  }
  const out = []
  for (const pc of raw.back || []) out.push({ ...pc, layer: pc.layer || 'back_hair' })
  for (const pc of raw.front || []) out.push({ ...pc, layer: pc.layer || raw.layer })
  for (const pc of raw.connectors || []) out.push({ ...pc })
  if (raw.src && !out.some((p) => p.src === raw.src)) {
    out.unshift({ src: raw.src, layer: raw.layer })
  }
  return out
}

function occlusionOf(raw) {
  if (raw.occlusion && (raw.occlusion.hideCharacterPieces || raw.occlusion.clearsSlots || raw.occlusion.hideSlots || raw.occlusion.replaceCharacterPieces)) {
    return {
      hideCharacterPieces: raw.occlusion.hideCharacterPieces || [],
      clearsSlots: raw.occlusion.clearsSlots || [],
      hideSlots: raw.occlusion.hideSlots || [],
      replaceCharacterPieces: raw.occlusion.replaceCharacterPieces || {},
    }
  }
  const hidePieces = [...(raw.hidesPieces || [])]
  const clears = [...(raw.removes || [])]
  for (const h of raw.hides || []) {
    if (CHAR_PIECE_KEYS.has(h)) hidePieces.push(h)
    else if (SLOT_IDS.has(h)) clears.push(h)
    else hidePieces.push(h)
  }
  return {
    hideCharacterPieces: hidePieces,
    clearsSlots: clears,
    hideSlots: raw.covers || [],
    replaceCharacterPieces: raw.replacePieces || {},
  }
}

export function normalizePart(raw) {
  const pieces = flattenPieces(raw)
  const multi = raw.multi === true || (raw.slot == null && Array.isArray(raw.anchors) && raw.anchors.length > 0)
  const slot = multi ? null : (raw.slot ?? raw.layer)
  const first = pieces[0] || {}
  const size = raw.size || (first.w != null && first.h != null ? { w: first.w, h: first.h } : null)
  return {
    ...raw,
    slot,
    multi,
    scale: raw.scale ?? 1,
    anchor: raw.anchor || (slot ? SLOT_ANCHOR[slot] : null) || null,
    anchors: raw.anchors || [],
    pieces,
    size,
    occlusion: occlusionOf(raw),
  }
}

const all = Object.values(partFiles).map(normalizePart)
const rank = (id) => {
  const i = LAYERS.partOrder.indexOf(id)
  return i < 0 ? 999 : i
}
export const PARTS = all.sort((a, b) => rank(a.id) - rank(b.id))
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]))
export const BACKGROUNDS = Object.values(bgFiles).sort((a, b) => a.id.localeCompare(b.id))

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

function attachOf(part, pc) {
  return pc.attach || part.attach || DEFAULT_ATTACH[pc.layer || part.layer] || { x: 0.5, y: 0.5 }
}

// PNG 픽셀 크기(sizes[src] = {w,h} 스테이지 단위)로 x/y/w/h 가 빠진 조각을 앵커에 올려 놓는다.
export function resolvePiece(part, pc, sizes) {
  const scale = part.scale ?? 1
  const nat = sizes?.[pc.src]
  const w = pc.w != null ? pc.w : nat ? nat.w * scale : null
  const h = pc.h != null ? pc.h : nat ? nat.h * scale : null
  if (pc.x != null && pc.y != null && w != null && h != null) return { ...pc, w, h }
  const anc = CHARACTER.anchors[part.anchor]
  if (!anc || w == null || h == null) return { ...pc, w, h, x: pc.x ?? 0, y: pc.y ?? 0 }
  const at = attachOf(part, pc)
  const off = part.offset || {}
  return {
    ...pc,
    w,
    h,
    x: anc.x - w * at.x + (off.dx || 0),
    y: anc.y - h * at.y + (off.dy || 0),
  }
}

// 화면에 그릴 조각 목록 (z 오름차순)
export function layersFor(worn, accs, sizes) {
  const allWorn = Object.values(worn).map((id) => PART[id]).filter(Boolean)
  // 덮는 옷(예: 곰 우주복)이 가리는 슬롯은 그리지 않음(입은 정보는 그대로 둠)
  const hideSlots = new Set(allWorn.flatMap((p) => p.occlusion?.hideSlots || []))
  const parts = allWorn.filter((p) => !hideSlots.has(p.slot))
  const hidden = new Set(parts.flatMap((p) => p.occlusion?.hideCharacterPieces || []))
  const has = (slot) => !hideSlots.has(slot) && Boolean(worn[slot] && PART[worn[slot]])
  const out = []
  const replaced = Object.assign({}, ...parts.map((p) => p.occlusion?.replaceCharacterPieces || {}))
  CHARACTER.pieces.forEach((p, i) => {
    if (hidden.has(p.key)) return
    const q = replaced[p.key] ? { ...p, src: replaced[p.key] } : p
    out.push({ key: `c-${p.key}`, z: LAYER_Z[p.layer] + i, p: q })
  })
  parts.forEach((part) => {
    part.pieces.forEach((pc, i) => {
      if (pc.preview) return
      if (pc.onlyWith && !Object.values(worn).includes(pc.onlyWith)) return
      if (pc.unlessSlot && has(pc.unlessSlot)) return
      const alt = pc.alt && has(pc.alt.when) ? { ...pc, ...pc.alt } : pc
      const resolved = resolvePiece(part, alt, sizes)
      if (resolved.w == null || resolved.h == null) return
      out.push({ key: `${part.id}-${i}`, z: LAYER_Z[resolved.layer || part.layer] + 10 + i, p: resolved, partId: part.id })
    })
  })
  accs.forEach((a, i) => {
    const part = PART[a.id]
    if (!part) return
    const box = accBox(a, sizes)
    if (box.w == null || box.h == null) return
    const layer = a.anchor ? CHARACTER.anchors[a.anchor].layer : part.layer || 'hand_prop'
    const src = part.pieces[0]?.src
    out.push({ key: `acc-${a.uid}`, z: LAYER_Z[layer] + 50 + i, p: { src, ...box }, accUid: a.uid })
  })
  return out.sort((a, b) => a.z - b.z)
}

export function accBox(a, sizes) {
  const part = PART[a.id]
  const anc = a.anchor && CHARACTER.anchors[a.anchor]
  const k = anc ? anc.size : 0.6
  const src = part.pieces[0]?.src
  const nat = sizes?.[src]
  const pw = part.size?.w ?? part.pieces[0]?.w ?? nat?.w
  const ph = part.size?.h ?? part.pieces[0]?.h ?? nat?.h
  const scale = part.scale ?? 1
  const w = pw * k * scale
  const h = ph * k * scale
  const off = (anc && part.anchorOffset && part.anchorOffset[a.anchor]) || part.offset || {}
  const cx = anc ? anc.x + (off.dx || 0) : a.x
  const cy = anc ? anc.y + (off.dy || 0) : a.y
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function nearestAnchor(part, x, y, radius = SNAP_RADIUS) {
  let best = null
  for (const id of part.anchors || []) {
    const a = CHARACTER.anchors[id]
    if (!a) continue
    const d = Math.hypot(a.x - x, a.y - y)
    if (d < radius && (!best || d < best.d)) best = { id, d }
  }
  return best?.id || null
}

// 드롭 결과: 슬롯 부품은 정해진 자리에, 장식은 가까운 앵커(멀면 그 자리).
export function snapDrop(part, x, y, inside) {
  if (!inside) return { action: 'discard' }
  if (part.slot && !part.multi) return { action: 'wear' }
  const anchor = nearestAnchor(part, x, y)
  if (anchor) return { action: 'anchor', anchor }
  return { action: 'free', x, y }
}

export function partSrcs(part) {
  return [...new Set((part.pieces || []).map((p) => p.src).filter(Boolean))]
}
