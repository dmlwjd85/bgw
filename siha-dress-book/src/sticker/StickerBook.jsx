import { useEffect, useMemo, useRef, useState } from 'react'
import { ACC_LIMIT } from './const.js'
import { BACKGROUNDS, CATEGORIES, CHARACTER, DEFAULT_BG, PART, PARTS, STAGE, accBox, fixId, layersFor, nearestAnchor, thumbPieces, wear, withDefaults } from './model.js'

const STORAGE_KEY = 'siha-sticker-book-v1'
const BASE = `${import.meta.env.BASE_URL}sticker/`
const { w: SW, h: SH } = STAGE

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!d || typeof d !== 'object') return null
    const worn = {}
    const accs = []
    for (const [slot, raw] of Object.entries(d.worn || {})) {
      const id = fixId(raw)
      const part = PART[id]
      if (!part) continue
      if (part.multi) accs.push({ id, uid: `${id}-${slot}`, anchor: part.anchors.includes(slot === 'pin' ? 'side' : 'crown') ? (slot === 'pin' ? 'side' : 'crown') : part.anchors[0] })
      else worn[part.slot] = id
    }
    for (const a of [...(d.props || []), ...(d.accs || [])]) {
      const id = fixId(a.id)
      const part = PART[id]
      if (!part?.multi) continue
      const anchor = a.anchor && part.anchors.includes(a.anchor) ? a.anchor : null
      accs.push({ id, uid: String(a.uid ?? Math.random()), anchor, x: a.x ?? SW / 2, y: a.y ?? SH / 2, ...(a.size != null ? { size: a.size, layer: a.layer } : {}) })
    }
    const bg = BACKGROUNDS.some((b) => b.id === d.bg) ? d.bg : DEFAULT_BG
    // v3 이전 저장본: 붙어 있던(스냅된) 자리·크기·층을 그대로 고정 위치로 바꿈
    const free = accs.map((a) => {
      if (a.size != null) return a
      const b = accBox(a)
      const anc = a.anchor && CHARACTER.anchors[a.anchor]
      return { id: a.id, uid: a.uid, anchor: null, x: b.x + b.w / 2, y: b.y + b.h / 2, size: anc ? anc.size : 0.6, layer: anc ? anc.layer : 'hand_prop' }
    })
    const pos = {}
    for (const [slot, o] of Object.entries(d.pos || {})) if (worn[slot] && Number.isFinite(o?.dx) && Number.isFinite(o?.dy)) pos[slot] = { dx: o.dx, dy: o.dy }
    return { worn, accs: free.slice(0, ACC_LIMIT), bg, pos }
  } catch {
    return null
  }
}

const pct = (v, total) => `${(v / total) * 100}%`

function anchorOf(part) {
  const xs = part.pieces.flatMap((p) => [p.x, p.x + p.w])
  const ys = part.pieces.flatMap((p) => [p.y, p.y + p.h])
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// 장식을 (x,y)에 놓았을 때의 모습: 위치는 놓은 곳 그대로(스냅 없음). 크기·층은 가장 가까운 자리의 것.
function accLook(part, x, y, prev) {
  const near = CHARACTER.anchors[nearestAnchor(part, x, y, Infinity) || part.anchors[0]]
  return { x, y, size: prev?.size ?? near.size, layer: prev?.layer ?? near.layer }
}
// 트레이에서 눌러 붙일 때의 처음 자리: 그 장식의 첫 번째 몸 자리(위치·크기·층)
function accFitted(part) {
  const id = part.anchors[0]
  const b = accBox({ id: part.id, anchor: id })
  const anc = CHARACTER.anchors[id]
  return { x: b.x + b.w / 2, y: b.y + b.h / 2, size: anc.size, layer: anc.layer }
}
// 옷을 (x,y)에 놓았을 때: 놓은 곳 그대로
function partOffset(part, x, y) {
  const a = anchorOf(part)
  return { dx: x - a.x, dy: y - a.y }
}

export default function StickerBook() {
  const saved = useRef(load())
  const [worn, setWorn] = useState(saved.current?.worn || {})
  const [accs, setAccs] = useState(saved.current?.accs || [])
  const [bg, setBg] = useState(saved.current?.bg || DEFAULT_BG)
  const [pos, setPos] = useState(saved.current?.pos || {})
  const [cat, setCat] = useState('dress')
  const [ghost, setGhost] = useState(null)
  const [toast, setToast] = useState('')
  const [snapKey, setSnapKey] = useState(null)
  const stageRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 3, worn, pos, accs, bg }))
  }, [worn, pos, accs, bg])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const list = useMemo(() => PARTS.filter((p) => p.category === cat), [cat])
  const wornView = withDefaults(worn)
  const layers = layersFor(worn, accs, pos)
  const bgItem = BACKGROUNDS.find((b) => b.id === bg) || BACKGROUNDS.find((b) => b.id === DEFAULT_BG) || BACKGROUNDS[0]

  function pt(e) {
    const r = stageRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * SW, y: ((e.clientY - r.top) / r.height) * SH, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }
  }
  const flash = (k) => { setSnapKey(k); setTimeout(() => setSnapKey(null), 350) }
  // 옷: 놓은 자리 그대로(정해진 자리에서 dx,dy 만큼). 잡은 점을 기억해 손가락 아래 그 점이 오도록.
  function put(part, o = { dx: 0, dy: 0 }) {
    const cleared = wear(worn, part)
    setWorn(cleared)
    setPos((p) => { const n = {}; for (const s of Object.keys(cleared)) if (p[s] && s !== part.slot) n[s] = p[s]; n[part.slot] = o; return n })
    flash(part.id)
  }
  function takeOff(part) { setWorn((w) => { const n = { ...w }; delete n[part.slot]; return n }); setPos((p) => { const n = { ...p }; delete n[part.slot]; return n }) }
  function placeAcc(part, x, y, uid, look) {
    const prev = uid && accs.find((a) => a.uid === uid)
    const L = look || accLook(part, x, y, prev)
    const next = { id: part.id, uid: uid || `${part.id}-${Date.now()}`, anchor: null, x: L.x, y: L.y, size: L.size, layer: L.layer }
    setAccs((list) => {
      const rest = list.filter((a) => a.uid !== next.uid)
      if (!uid && rest.length >= ACC_LIMIT) { setToast(`장식은 ${ACC_LIMIT}개까지 붙일 수 있어요`); return list }
      return [...rest, next]
    })
    flash(next.uid)
    setToast('놓은 자리에 붙였어요')
  }

  function start(e, payload) {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p0 = stageRef.current ? pt(e) : null
    // 무대 위 스티커를 잡으면 잡은 점과 스티커 기준점의 차이를 기억 → 놓을 때 그대로
    let grab = { x: 0, y: 0 }
    if (payload.from === 'stage' && p0) {
      if (payload.uid) { const a = accs.find((q) => q.uid === payload.uid); const b = accBox(a); grab = { x: p0.x - (b.x + b.w / 2), y: p0.y - (b.y + b.h / 2) } }
      else { const part = PART[payload.id]; const c = anchorOf(part); const o = pos[part.slot] || { dx: 0, dy: 0 }; grab = { x: p0.x - (c.x + o.dx), y: p0.y - (c.y + o.dy) } }
    }
    drag.current = { ...payload, grab, sx: e.clientX, sy: e.clientY, moved: false }
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return
    d.moved = true
    const p = pt(e)
    const part = PART[d.id]
    const r = stageRef.current.getBoundingClientRect()
    const rect = { left: r.left, top: r.top, width: r.width, height: r.height }
    if (part.multi) {
      const prev = d.uid && accs.find((a) => a.uid === d.uid)
      const L = accLook(part, p.x - d.grab.x, p.y - d.grab.y, prev)
      const b = accBox({ id: part.id, x: L.x, y: L.y, size: L.size })
      setGhost({ id: d.id, uid: d.uid, rect, out: !p.inside, pieces: [{ src: part.pieces[0].src, ...b }] })
    } else {
      const o = partOffset(part, p.x - d.grab.x, p.y - d.grab.y)
      const ids = Object.values(withDefaults(worn))
      const pcs = part.pieces.filter((pc) => {
        if (pc.patch) return false
        if (pc.onlyWith && !ids.includes(pc.onlyWith)) return false
        if (pc.unlessWith && ids.includes(pc.unlessWith)) return false
        return true
      }).map((pc) => ({ ...pc, x: pc.x + o.dx, y: pc.y + o.dy }))
      setGhost({ id: d.id, rect, out: !p.inside, pieces: pcs })
    }
  }
  function end(e) {
    const d = drag.current
    drag.current = null
    setGhost(null)
    if (!d) return
    const part = PART[d.id]
    const p = pt(e)
    if (!d.moved) {
      if (d.from !== 'tray') return
      if (part.multi) { const f = accFitted(part); placeAcc(part, f.x, f.y, undefined, f) }
      else if (worn[part.slot] === part.id) takeOff(part)
      else put(part)
      return
    }
    if (part.multi) {
      if (!p.inside) {
        if (d.uid) setAccs((l) => l.filter((a) => a.uid !== d.uid))
        return
      }
      placeAcc(part, p.x - d.grab.x, p.y - d.grab.y, d.uid)
      return
    }
    if (p.inside) put(part, partOffset(part, p.x - d.grab.x, p.y - d.grab.y))
    else if (d.from === 'stage') { takeOff(part); setToast(`${part.name}을(를) 벗었어요`) }
  }

  function reset() {
    if (!window.confirm('입힌 옷과 장식을 모두 벗길까요?')) return
    setWorn({})
    setPos({})
    setAccs([])
  }

  async function saveImage() {
    const R = CHARACTER.res
    const c = document.createElement('canvas')
    c.width = SW * R
    c.height = SH * R
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = BASE + src })
    if (bgItem) g.drawImage(await img(bgItem.src), 0, 0, c.width, c.height)
    for (const l of layers) g.drawImage(await img(l.p.src), l.p.x * R, l.p.y * R, l.p.w * R, l.p.h * R)
    const a = document.createElement('a')
    a.download = 'siha-sticker.png'
    a.href = c.toDataURL('image/png')
    a.click()
    setToast('코디를 그림으로 저장했어요')
  }

  const bgIndex = Math.max(0, BACKGROUNDS.findIndex((b) => b.id === bg))

  // 덮는 옷(곰 우주복)이 가리는 슬롯 → 그 칸 스티커는 흐리게, 누르면 짧은 안내
  const covered = new Map()
  Object.values(worn).forEach((id) => (PART[id]?.occlusion?.hideSlots || []).forEach((sl) => covered.set(sl, PART[id].name)))
  return (
    <div className="sb" onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setGhost(null) }}>
      <header className="sb-head">
        <h1>시하 스티커북</h1>
        <div className="sb-tools">
          <button type="button" onClick={() => setBg(BACKGROUNDS[(bgIndex + 1) % BACKGROUNDS.length].id)}>배경: {bgItem?.name}</button>
          <button type="button" onClick={reset}>초기화</button>
          <button type="button" className="main" onClick={saveImage}>저장</button>
        </div>
      </header>
      <main className="sb-layout">
        <section className="sb-stage-wrap">
          <div className="sb-stage" ref={stageRef} data-testid="stage" style={{ backgroundImage: bgItem ? `url(${BASE + bgItem.src})` : undefined }}>
            {layers.map((l) => {
              const draggable = l.partId || l.accUid
              const flashOn = snapKey && (snapKey === l.partId || snapKey === l.accUid)
              const lifted = ghost && ((l.accUid && l.accUid === ghost.uid) || (!ghost.uid && l.partId && l.partId === ghost.id))
              return (
                <img key={l.key} className={`sb-piece ${draggable ? 'sb-drag' : ''} ${flashOn ? 'snap' : ''}`} src={BASE + l.p.src} alt="" draggable={false}
                  onPointerDown={draggable ? (e) => start(e, l.accUid ? { id: accs.find((a) => a.uid === l.accUid).id, uid: l.accUid, from: 'stage' } : { id: l.partId, from: 'stage' }) : undefined}
                  style={{ left: pct(l.p.x, SW), top: pct(l.p.y, SH), width: pct(l.p.w, SW), height: pct(l.p.h, SH), zIndex: l.z, opacity: lifted ? 0 : undefined }} />
              )
            })}
          </div>
          <p className="sb-hint">누르면 몸에 맞는 자리에 붙고, 끌어다 놓으면 놓은 자리에 그대로 붙어요. 끌 때 보이는 크기 그대로 놓여요. 무대 밖으로 끌어내면 떼어져요.</p>
        </section>
        <section className="sb-sheet" aria-label="스티커 시트">
          <div className="sb-cats" role="tablist">
            {CATEGORIES.filter((c) => PARTS.some((p) => p.category === c.id)).map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="sb-tray">
            {list.map((p) => (
              <button key={p.id} type="button" className={`sb-sticker ${wornView[p.slot] === p.id || accs.some((a) => a.id === p.id) ? 'on' : ''} ${covered.has(p.slot) ? 'off' : ''}`}
                aria-disabled={covered.has(p.slot) || undefined}
                onPointerDown={(e) => covered.has(p.slot) ? setToast(`${covered.get(p.slot)}을(를) 벗으면 입을 수 있어요`) : start(e, { id: p.id, from: 'tray' })}
                aria-label={covered.has(p.slot) ? `${p.name} (${covered.get(p.slot)}을(를) 벗으면 입을 수 있어요)` : p.name}>
                <span className="sb-thumb">{thumbPieces(p).map((pc) => <img key={pc.src} src={BASE + pc.src} alt="" draggable={false} />)}</span>
                <span className="sb-name">{p.name}</span>
                {covered.has(p.slot) && <span className="sb-lock">{covered.get(p.slot)} 벗기!</span>}
              </button>
            ))}
          </div>
        </section>
      </main>
      {ghost && (
        <div className={`sb-ghost ${ghost.out ? 'out' : ''}`} data-testid="ghost" style={{ left: ghost.rect.left, top: ghost.rect.top, width: ghost.rect.width, height: ghost.rect.height }}>
          {ghost.pieces.map((pc, i) => <img key={i} src={BASE + pc.src} alt="" style={{ left: pct(pc.x, SW), top: pct(pc.y, SH), width: pct(pc.w, SW), height: pct(pc.h, SH) }} />)}
        </div>
      )}
      {toast && <div className="sb-toast" role="status">{toast}</div>}
    </div>
  )
}
