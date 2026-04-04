import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 프로젝트 사이트: https://dmlwjd85.github.io/bgw/ → base는 /bgw/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/bgw/' : '/'
}));
