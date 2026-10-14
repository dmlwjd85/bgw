import { useEffect, useMemo, useRef, useState } from 'react'
import { ACC_LIMIT } from './const.js'
import { BACKGROUNDS, CATEGORIES, CHARACTER, PART, PARTS, STAGE, layersFor, partSrcs, snapDrop, wear, fixId } from './model.js'

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
      accs.push({ id, uid: String(a.uid ?? Math.random()), anchor, x: a.x ?? SW / 2, y: a.y ?? SH / 2 })
    }
    const bg = BACKGROUNDS.some((b) => b.id === d.bg) ? d.bg : BACKGROUNDS[0]?.id
    return { worn, accs: accs.slice(0, ACC_LIMIT), bg }
  } catch {
    return null
  }
}

const pct = (v, total) => `${(v / total) * 100}%`

function usePartSizes() {
  const [sizes, setSizes] = useState({})
  useEffect(() => {
    let live = true
    const srcs = new Set()
    PARTS.forEach((p) => partSrcs(p).forEach((s) => srcs.add(s)))
    CHARACTER.pieces.forEach((p) => srcs.add(p.src))
    srcs.forEach((src) => {
      const img = new Image()
      img.onload = () => {
        if (!live) return
        setSizes((prev) => ({
          ...prev,
          [src]: { w: img.naturalWidth / CHARACTER.res, h: img.naturalHeight / CHARACTER.res },
        }))
      }
      img.src = BASE + src
    })
    return () => {
      live = false
    }
  }, [])
  return sizes
}

function thumbPieces(part) {
  // 앞면 대표 그림만 썸네일로 (손 이음·틈 메움·조건부 조각 제외). preview 가 있으면 자른 앞면 대신 원본 한 장을 씀.
  const thumbs = part.pieces.filter((pc) => pc.preview)
  if (thumbs.length) return thumbs.slice(0, 2)
  return part.pieces.filter((pc) => !pc.onlyWith && !pc.patch && !pc.preview && (pc.layer === part.layer || !pc.layer)).slice(0, 2)
}

export default function StickerBook() {
  const saved = useRef(load())
  const [worn, setWorn] = useState(saved.current?.worn || {})
  const [accs, setAccs] = useState(saved.current?.accs || [])
  const [bg, setBg] = useState(saved.current?.bg || BACKGROUNDS[0]?.id)
  const [cat, setCat] = useState('dress')
  const [ghost, setGhost] = useState(null)
  const [toast, setToast] = useState('')
  const [snapKey, setSnapKey] = useState(null)
  const stageRef = useRef(null)
  const drag = useRef(null)
  const sizes = usePartSizes()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, worn, accs, bg }))
  }, [worn, accs, bg])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const list = useMemo(() => PARTS.filter((p) => p.category === cat), [cat])
  const layers = layersFor(worn, accs, sizes)
  const bgItem = BACKGROUNDS.find((b) => b.id === bg) || BACKGROUNDS[0]

  function pt(e) {
    const r = stageRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * SW, y: ((e.clientY - r.top) / r.height) * SH, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }
  }
  const flash = (k) => {
    setSnapKey(k)
    setTimeout(() => setSnapKey(null), 350)
  }
  function put(part) {
    setWorn((w) => wear(w, part))
    flash(part.id)
  }
  function takeOff(part) {
    setWorn((w) => {
      const n = { ...w }
      delete n[part.slot]
      return n
    })
  }
  function placeAcc(part, x, y, uid, anchor) {
    const next = { id: part.id, uid: uid || `${part.id}-${Date.now()}`, anchor, x, y }
    setAccs((list) => {
      const rest = list.filter((a) => a.uid !== next.uid)
      if (!uid && rest.length >= ACC_LIMIT) {
        setToast(`장식은 ${ACC_LIMIT}개까지 붙일 수 있어요`)
        return list
      }
      return [...rest, next]
    })
    flash(next.uid)
    setToast(anchor ? `${CHARACTER.anchors[anchor].label}에 붙였어요` : '원하는 자리에 붙였어요')
  }

  function start(e, payload) {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { ...payload, sx: e.clientX, sy: e.clientY, moved: false }
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return
    d.moved = true
    setGhost({ id: d.id, x: e.clientX, y: e.clientY })
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
      if (part.multi) placeAcc(part, CHARACTER.anchors[part.anchors[0]].x, CHARACTER.anchors[part.anchors[0]].y, null, part.anchors[0])
      else if (worn[part.slot] === part.id) takeOff(part)
      else put(part)
      return
    }
    const snap = snapDrop(part, p.x, p.y, p.inside)
    if (part.multi) {
      if (snap.action === 'discard') {
        if (d.uid) setAccs((l) => l.filter((a) => a.uid !== d.uid))
        return
      }
      placeAcc(part, p.x, p.y, d.uid, snap.action === 'anchor' ? snap.anchor : null)
      return
    }
    if (snap.action === 'wear') put(part)
    else if (d.from === 'stage') {
      takeOff(part)
      setToast(`${part.name}을(를) 벗었어요`)
    } else setToast('캐릭터 위에 놓으면 정해진 자리에 붙어요')
  }

  function reset() {
    if (!window.confirm('입힌 옷과 장식을 모두 벗길까요?')) return
    setWorn({})
    setAccs([])
  }

  async function saveImage() {
    const R = CHARACTER.res
    const c = document.createElement('canvas')
    c.width = SW * R
    c.height = SH * R
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    const img = (src) =>
      new Promise((ok, no) => {
        const i = new Image()
        i.onload = () => ok(i)
        i.onerror = no
        i.src = BASE + src
      })
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
              return (
                <img
                  key={l.key}
                  className={`sb-piece ${draggable ? 'sb-drag' : ''} ${flashOn ? 'snap' : ''}`}
                  src={BASE + l.p.src}
                  alt=""
                  draggable={false}
                  onPointerDown={draggable ? (e) => start(e, l.accUid ? { id: accs.find((a) => a.uid === l.accUid).id, uid: l.accUid, from: 'stage' } : { id: l.partId, from: 'stage' }) : undefined}
                  style={{ left: pct(l.p.x, SW), top: pct(l.p.y, SH), width: pct(l.p.w, SW), height: pct(l.p.h, SH), zIndex: l.z }}
                />
              )
            })}
          </div>
          <p className="sb-hint">옷·신발은 캐릭터 위에 놓으면 정해진 자리에 붙어요. 리본·꽃은 가까운 자리(정수리·옆머리·목·허리·신발·손)에 붙고, 멀리 놓으면 그 자리에 그대로 붙어요. 몸 밖으로 끌어내면 떼어져요.</p>
        </section>
        <section className="sb-sheet" aria-label="스티커 시트">
          <div className="sb-cats" role="tablist">
            {CATEGORIES.filter((c) => PARTS.some((p) => p.category === c.id)).map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="sb-tray">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`sb-sticker ${worn[p.slot] === p.id || accs.some((a) => a.id === p.id) ? 'on' : ''} ${covered.has(p.slot) ? 'off' : ''}`}
                aria-disabled={covered.has(p.slot) || undefined}
                onPointerDown={(e) => (covered.has(p.slot) ? setToast(`${covered.get(p.slot)}을 벗으면 신을 수 있어요`) : start(e, { id: p.id, from: 'tray' }))}
                aria-label={covered.has(p.slot) ? `${p.name} (${covered.get(p.slot)}을 벗으면 신을 수 있어요)` : p.name}
              >
                <span className="sb-thumb">
                  {thumbPieces(p).map((pc) => (
                    <img key={pc.src} src={BASE + pc.src} alt="" draggable={false} />
                  ))}
                </span>
                <span className="sb-name">{p.name}</span>
                {covered.has(p.slot) && <span className="sb-lock">곰 옷 벗기!</span>}
              </button>
            ))}
          </div>
        </section>
      </main>
      {ghost && (
        <div className="sb-ghost" style={{ left: ghost.x, top: ghost.y }}>
          {thumbPieces(PART[ghost.id]).map((pc) => (
            <img key={pc.src} src={BASE + pc.src} alt="" />
          ))}
        </div>
      )}
      {toast && (
        <div className="sb-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
