import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 보드게임 월드 페이지 하위 경로: https://dmlwjd85.github.io/bgw/siha/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/bgw/siha/' : '/',
  server: { port: 5178, strictPort: true },
}))
