import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import StickerBook from './sticker/StickerBook.jsx'
import './index.css'
import './sticker/sticker.css'

const PRIVACY_HREF = `${import.meta.env.BASE_URL}privacy.html`

// 배포본에서만 등록. 개발 서버 캐시가 옛 파일을 붙잡지 않게 한다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  })
}

// #dress → 기존 시하 드레스 북, 그 밖(기본) → 새 스티커북. 두 화면의 저장 데이터는 키가 달라 서로 건드리지 않는다.
function useMode() {
  const read = () => (window.location.hash === '#dress' ? 'dress' : 'sticker')
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const on = () => setMode(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return mode
}

function ParentalPrivacyLink() {
  const [open, setOpen] = useState(false)
  const [a, setA] = useState(3)
  const [b, setB] = useState(4)
  const [value, setValue] = useState('')
  const [err, setErr] = useState(false)

  function start(event) {
    event.preventDefault()
    setA(2 + Math.floor(Math.random() * 8))
    setB(2 + Math.floor(Math.random() * 8))
    setValue('')
    setErr(false)
    setOpen(true)
  }

  function submit(event) {
    event.preventDefault()
    if (Number(value) === a + b) {
      window.location.href = PRIVACY_HREF
      return
    }
    setErr(true)
  }

  return (
    <>
      <a href={PRIVACY_HREF} className="sb-privacy" onClick={start}>
        개인정보 처리방침
      </a>
      {open && (
        <div className="sb-gate" role="dialog" aria-modal="true" aria-labelledby="sb-gate-title">
          <form className="sb-gate-card" onSubmit={submit}>
            <p id="sb-gate-title">보호자 확인</p>
            <p>개인정보 처리방침은 보호자가 읽어 주세요. {a} + {b} = ?</p>
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => { setValue(e.target.value); setErr(false) }}
              aria-label="덧셈 답"
              autoFocus
            />
            {err && <p className="sb-gate-err" role="alert">답이 달라요. 다시 해 보세요.</p>}
            <div className="sb-gate-actions">
              <button type="button" onClick={() => setOpen(false)}>닫기</button>
              <button type="submit" className="main">확인</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function Root() {
  const mode = useMode()
  return (
    <>
      <nav className="sb-modes" aria-label="화면 고르기">
        <a href="#sticker" className={mode === 'sticker' ? 'on' : ''}>스티커북</a>
        <a href="#dress" className={mode === 'dress' ? 'on' : ''}>드레스 북</a>
        <ParentalPrivacyLink />
      </nav>
      {mode === 'dress' ? <App /> : <StickerBook />}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
