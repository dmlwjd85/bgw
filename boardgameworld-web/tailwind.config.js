/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        /** 태블릿·폰 가로모드 등 세로 픽셀이 짧을 때 */
        'landscape-short': { raw: '(orientation: landscape) and (max-height: 600px)' },
        'landscape-tight': { raw: '(orientation: landscape) and (max-height: 480px)' }
      }
    }
  },
  plugins: []
};
