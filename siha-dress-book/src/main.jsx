import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import StickerBook from './sticker/StickerBook.jsx'
import './index.css'
import './sticker/sticker.css'

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

function Root() {
  const mode = useMode()
  useEffect(() => {
    document.title = mode === 'dress' ? '시하 드레스 북' : '시하 스티커북'
  }, [mode])
  return (
    <>
      <nav className="sb-modes" aria-label="화면 고르기">
        <a href="#sticker" className={mode === 'sticker' ? 'on' : ''}>스티커북</a>
        <a href="#dress" className={mode === 'dress' ? 'on' : ''}>드레스 북</a>
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
