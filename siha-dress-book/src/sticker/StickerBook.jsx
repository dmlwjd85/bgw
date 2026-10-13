import { useEffect, useMemo, useRef, useState } from 'react'
import META from './stickers.json'

const STORAGE_KEY = 'siha-sticker-book-v1'
const BASE = `${import.meta.env.BASE_URL}sticker/`
const { w: SW, h: SH } = META.stage
const ITEMS = META.items
const ITEM = Object.fromEntries(ITEMS.map((it) => [it.id, it]))
const SNAP_RADIUS = 0.42 // 스테이지 폭 대비: 이 안에 놓으면 정해진 자리로 붙는다

export const BACKGROUNDS = [
  { id: 'room', label: '분홍 방', css: 'linear-gradient(#ffe6f0 0 62%, #f6c9da 62% 100%)' },
  { id: 'sky', label: '하늘', css: 'linear-gradient(#bfe6ff, #eef8ff 70%, #cfeec4 70%)' },
  { id: 'garden', label: '꽃밭', css: 'radial-gradient(circle at 20% 85%, #ffd1e3 0 6%, transparent 7%), radial-gradient(circle at 78% 90%, #fff3a8 0 5%, transparent 6%), linear-gradient(#e9fff1 0 60%, #a8e3a1 60%)' },
  { id: 'stage', label: '무대', css: 'radial-gradient(ellipse at 50% 0%, #fff6c9 0 30%, #b694e8 70%, #6d4fb3)' },
  { id: 'plain', label: '흰 종이', css: '#fffdf8' },
]

// 겹치는 순서: 몸 0 → 양말 20 → 신발 30 → 상의 40 → 목 45 → 하의 50 → 원피스 60 → 우주복 65 → 머리 80+ → 소품 90
function wearItem(worn, item) {
  const next = { ...worn }
  if (item.slot === 'dress') {
    delete next.top
    delete next.bottom
  }
  if (item.slot === 'top' || item.slot === 'bottom') delete next.dress
  next[item.slot] = item.id
  return next
}

function anchor(item) {
  const xs = item.pieces.flatMap((p) => [p.x, p.x + p.w])
  const ys = item.pieces.flatMap((p) => [p.y, p.y + p.h])
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!d || typeof d !== 'object') return null
    const worn = Object.fromEntries(Object.entries(d.worn || {}).filter(([, id]) => ITEM[id] && !ITEM[id].free))
    const props = (d.props || []).filter((p) => ITEM[p.id]?.free)
    return { worn, props, bg: BACKGROUNDS.some((b) => b.id === d.bg) ? d.bg : 'room' }
  } catch {
    return null
  }
}

const pct = (v, total) => `${(v / total) * 100}%`

function Piece({ p, z }) {
  return (
    <img
      className="sb-piece"
      src={BASE + p.src}
      alt=""
      draggable={false}
      style={{ left: pct(p.x, SW), top: pct(p.y, SH), width: pct(p.w, SW), height: pct(p.h, SH), zIndex: z }}
    />
  )
}

export default function StickerBook() {
  const saved = useRef(load())
  const [worn, setWorn] = useState(saved.current?.worn || {})
  const [props, setProps] = useState(saved.current?.props || [])
  const [bg, setBg] = useState(saved.current?.bg || 'room')
  const [cat, setCat] = useState('dress')
  const [ghost, setGhost] = useState(null)
  const [toast, setToast] = useState('')
  const [snapId, setSnapId] = useState(null)
  const stageRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ worn, props, bg }))
  }, [worn, props, bg])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const list = useMemo(() => ITEMS.filter((it) => it.category === cat), [cat])

  function stagePoint(e) {
    const r = stageRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * SW, y: ((e.clientY - r.top) / r.height) * SH, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }
  }

  function snap(item) {
    setWorn((w) => wearItem(w, item))
    setSnapId(item.id)
    setTimeout(() => setSnapId(null), 350)
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
    const item = ITEM[d.id]
    const pt = stagePoint(e)
    if (!d.moved) {
      // 탭: 시트에서 누르면 입기/벗기, 몸 위에서 누르면 벗기
      if (d.from === 'tray' && !item.free) {
        if (worn[item.slot] === item.id) setWorn((w) => { const n = { ...w }; delete n[item.slot]; return n })
        else snap(item)
      } else if (d.from === 'tray' && item.free) {
        setProps((ps) => [...ps, { id: item.id, uid: Date.now(), x: SW * 0.78, y: SH * 0.45 }])
      }
      return
    }
    if (item.free) {
      if (!pt.inside) {
        if (d.from === 'stage') setProps((ps) => ps.filter((p) => p.uid !== d.uid))
        return
      }
      if (d.from === 'stage') setProps((ps) => ps.map((p) => (p.uid === d.uid ? { ...p, x: pt.x, y: pt.y } : p)))
      else setProps((ps) => [...ps, { id: item.id, uid: Date.now(), x: pt.x, y: pt.y }])
      return
    }
    const a = anchor(item)
    const near = pt.inside && Math.hypot(pt.x - a.x, pt.y - a.y) < SW * SNAP_RADIUS
    if (near) snap(item)
    else if (d.from === 'stage') {
      setWorn((w) => { const n = { ...w }; delete n[item.slot]; return n })
      setToast(`${item.name}을(를) 벗었어요`)
    } else setToast('몸 가까이에 놓으면 딱 맞게 붙어요')
  }

  function reset() {
    if (!window.confirm('입힌 옷과 소품을 모두 벗길까요?')) return
    setWorn({})
    setProps([])
  }

  async function saveImage() {
    const scale = 2
    const c = document.createElement('canvas')
    c.width = SW * scale
    c.height = SH * scale
    const g = c.getContext('2d')
    g.fillStyle = '#fffdf8'
    g.fillRect(0, 0, c.width, c.height)
    const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src })
    const layers = [{ z: 0, pieces: worn.shoes ? [META.body] : [META.body, META.feet] }]
    Object.values(worn).forEach((id) => ITEM[id] && layers.push({ z: ITEM[id].z, pieces: ITEM[id].pieces }))
    props.forEach((p) => { const it = ITEM[p.id]; const q = it.pieces[0]; layers.push({ z: 90, pieces: [{ ...q, x: p.x - q.w / 2, y: p.y - q.h / 2 }] }) })
    layers.sort((a, b) => a.z - b.z)
    for (const l of layers) for (const p of l.pieces) {
      const img = await loadImg(BASE + p.src)
      g.drawImage(img, p.x * scale, p.y * scale, p.w * scale, p.h * scale)
    }
    const a = document.createElement('a')
    a.download = 'siha-sticker.png'
    a.href = c.toDataURL('image/png')
    a.click()
    setToast('코디를 저장했어요')
  }

  const wornItems = Object.values(worn).map((id) => ITEM[id]).filter(Boolean)
  const bgIndex = BACKGROUNDS.findIndex((b) => b.id === bg)

  return (
    <div className="sb" onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setGhost(null) }}>
      <header className="sb-head">
        <h1>시하 스티커북</h1>
        <div className="sb-tools">
          <button type="button" onClick={() => setBg(BACKGROUNDS[(bgIndex + 1) % BACKGROUNDS.length].id)}>배경: {BACKGROUNDS[bgIndex].label}</button>
          <button type="button" onClick={reset}>초기화</button>
          <button type="button" className="main" onClick={saveImage}>저장</button>
        </div>
      </header>
      <main className="sb-layout">
        <section className="sb-stage-wrap">
          <div className="sb-stage" ref={stageRef} style={{ background: BACKGROUNDS[bgIndex].css }} data-testid="stage">
            <Piece p={META.body} z={0} />
            {!worn.shoes && <Piece p={META.feet} z={1} />}
            {wornItems.map((it) => (
              <div key={it.id} className={`sb-worn ${snapId === it.id ? 'snap' : ''}`} style={{ zIndex: it.z }}
                onPointerDown={(e) => start(e, { id: it.id, from: 'stage' })}>
                {it.pieces.map((p) => <Piece key={p.src} p={p} z={it.z} />)}
              </div>
            ))}
            {props.map((p) => {
              const q = ITEM[p.id].pieces[0]
              return (
                <img key={p.uid} className="sb-piece sb-prop" src={BASE + q.src} alt={ITEM[p.id].name} draggable={false}
                  onPointerDown={(e) => start(e, { id: p.id, uid: p.uid, from: 'stage' })}
                  style={{ left: pct(p.x - q.w / 2, SW), top: pct(p.y - q.h / 2, SH), width: pct(q.w, SW), height: pct(q.h, SH), zIndex: 90 }} />
              )
            })}
          </div>
          <p className="sb-hint">스티커를 몸 가까이에 끌어다 놓으면 딱 맞게 붙어요. 몸 밖으로 끌어내면 벗겨져요.</p>
        </section>
        <section className="sb-sheet" aria-label="스티커 시트">
          <div className="sb-cats" role="tablist">
            {META.categories.filter((c) => ITEMS.some((it) => it.category === c.id || (c.id === 'head' && it.category === 'pin'))).map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="sb-tray">
            {(cat === 'head' ? ITEMS.filter((it) => it.category === 'head' || it.category === 'pin') : list).map((it) => (
              <button key={it.id} type="button" className={`sb-sticker ${worn[it.slot] === it.id ? 'on' : ''}`}
                onPointerDown={(e) => start(e, { id: it.id, from: 'tray' })} aria-label={it.name}>
                <span className="sb-thumb">{it.pieces.slice(0, 2).map((p) => <img key={p.src} src={BASE + p.src} alt="" draggable={false} />)}</span>
                <span className="sb-name">{it.name}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
      {ghost && (
        <div className="sb-ghost" style={{ left: ghost.x, top: ghost.y }}>
          {ITEM[ghost.id].pieces.slice(0, 2).map((p) => <img key={p.src} src={BASE + p.src} alt="" />)}
        </div>
      )}
      {toast && <div className="sb-toast" role="status">{toast}</div>}
    </div>
  )
}
