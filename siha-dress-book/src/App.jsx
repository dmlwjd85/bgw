import { useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS } from './doll/Body.jsx'
import { Doll } from './doll/Doll.jsx'
import { CATEGORIES, DRESS_CODES, ITEMS, ITEM_MAP, PRESETS } from './doll/items.jsx'

const STORAGE_KEY = 'siha-dress-book-v1'

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return data
  } catch {
    return null
  }
}

function applyItem(prev, item, toggle) {
  const next = { ...prev }
  if (toggle && next[item.slot] === item.id) {
    delete next[item.slot]
    return next
  }
  if (item.slot === 'dress') {
    delete next.top
    delete next.bottom
  }
  if (item.slot === 'top' || item.slot === 'bottom') {
    delete next.dress
  }
  next[item.slot] = item.id
  return next
}

function isCodeComplete(code, equipped) {
  return code.required.every((slot) => {
    const item = ITEM_MAP[equipped[slot]]
    return item && item.codes.includes(code.id)
  })
}

export default function App() {
  const saved = useRef(loadSaved())
  const [characterId, setCharacterId] = useState(saved.current?.characterId || 'peach')
  const [equipped, setEquipped] = useState(saved.current?.equipped || {})
  const [category, setCategory] = useState('hair')
  const [codeFilter, setCodeFilter] = useState('all')
  const [ghost, setGhost] = useState(null)
  const stageRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ characterId, equipped }))
  }, [characterId, equipped])

  const stickers = useMemo(
    () =>
      ITEMS.filter((item) => item.category === category).filter(
        (item) => codeFilter === 'all' || item.codes.includes(codeFilter),
      ),
    [category, codeFilter],
  )

  const completed = DRESS_CODES.filter((code) => isCodeComplete(code, equipped))

  function wear(item, toggle) {
    setEquipped((prev) => applyItem(prev, item, toggle))
  }

  function onPointerDown(event, item) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      item,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag) return
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) {
      drag.moved = true
      setGhost({ id: drag.item.id, name: drag.item.name, x: event.clientX, y: event.clientY })
    }
  }

  function onPointerUp(event) {
    const drag = dragRef.current
    dragRef.current = null
    setGhost(null)
    if (!drag) return
    if (!drag.moved) {
      wear(drag.item, true)
      return
    }
    const box = stageRef.current?.getBoundingClientRect()
    if (!box) return
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    if (inside) wear(drag.item, false)
  }

  const worn = Object.entries(equipped)
    .map(([slot, id]) => ITEM_MAP[id] && { slot, item: ITEM_MAP[id] })
    .filter(Boolean)

  return (
    <div className="book">
      <header className="book-head">
        <div>
          <p className="eyebrow">스티커를 붙이는 코디북</p>
          <h1>시하 드레스 북</h1>
        </div>
        <p className="lede">몸을 고르고, 헤어부터 신발·소품까지 스티커처럼 붙여 코디를 완성해요.</p>
      </header>

      <main className="layout">
        <section className="sheet" aria-label="스티커 모음">
          <div className="tape">스티커 시트</div>
          <div className="code-row" role="tablist" aria-label="드레스 코드">
            <button type="button" className={codeFilter === 'all' ? 'on' : ''} onClick={() => setCodeFilter('all')}>
              전체
            </button>
            {DRESS_CODES.map((code) => (
              <button
                key={code.id}
                type="button"
                className={codeFilter === code.id ? 'on' : ''}
                onClick={() => setCodeFilter(code.id)}
              >
                {code.label}
              </button>
            ))}
          </div>
          <div className="cat-row" role="tablist" aria-label="아이템 종류">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={category === cat.id ? 'on' : ''}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="sticker-grid">
            {stickers.length === 0 && <p className="empty">이 칸에는 스티커가 없어요. 다른 드레스 코드를 눌러 보세요.</p>}
            {stickers.map((item, index) => {
              const on = equipped[item.slot] === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sticker ${on ? 'stuck' : ''} tilt-${index % 3}`}
                  aria-pressed={on}
                  onPointerDown={(event) => onPointerDown(event, item)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => {
                    dragRef.current = null
                    setGhost(null)
                  }}
                >
                  <Doll characterId={characterId} equipped={{ [item.slot]: item.id }} className="mini" />
                  <span>{item.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="stage-wrap">
          <div className="page" ref={stageRef}>
            <div className="holes" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="page-no">시하 01</p>
            {completed.length > 0 && (
              <div className="complete-flag">
                {completed.map((code) => code.label).join(' · ')} 코디 완성
              </div>
            )}
            <Doll characterId={characterId} equipped={equipped} />
            <p className="hint">스티커를 누르거나, 이 페이지 위로 끌어다 놓아요. 같은 스티커를 다시 누르면 떼집니다.</p>
          </div>
        </section>

        <aside className="side">
          <div className="panel">
            <h2>기본 몸</h2>
            <div className="bodies">
              {CHARACTERS.map((character) => (
                <button
                  key={character.id}
                  type="button"
                  className={characterId === character.id ? 'body-pick on' : 'body-pick'}
                  onClick={() => setCharacterId(character.id)}
                >
                  <Doll characterId={character.id} equipped={{}} className="mini" />
                  <span>{character.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>드레스 코드</h2>
            <ul className="codes">
              {DRESS_CODES.map((code) => {
                const done = isCodeComplete(code, equipped)
                return (
                  <li key={code.id}>
                    <div>
                      <strong>{code.label}</strong>
                      <span>{code.hint}</span>
                      {done && <em>완성</em>}
                    </div>
                    <button type="button" onClick={() => setEquipped({ ...PRESETS[code.id] })}>
                      한 벌 입히기
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="panel">
            <h2>붙은 스티커</h2>
            {worn.length === 0 && <p className="empty">아직 아무것도 붙지 않았어요.</p>}
            <ul className="worn">
              {worn.map(({ item }) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <button type="button" onClick={() => wear(item, true)} aria-label={`${item.name} 떼기`}>
                    떼기
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="clear" onClick={() => setEquipped({})}>
              모두 떼기
            </button>
          </div>
        </aside>
      </main>

      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.name}
        </div>
      )}
    </div>
  )
}
