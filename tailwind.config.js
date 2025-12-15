/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 日本傳統色配置
        ruri: '#1E50A2',      // 瑠璃色 (主色)
        'ruri-light': '#3A6CB8', // 稍微亮一點的瑠璃
        karakurenai: '#E95464', // 韓紅 (警告/刪除)
        gofun: '#FFFFFB',     // 胡粉 (背景)
        sumi: '#1C1C1C',      // 墨色 (文字)
        'kon-kikyo': '#211E55', // 紺桔梗 (深色背景/Footer)
      },
      fontFamily: {
        sans: ['"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'sans-serif'], // 優化日文顯示
      }
    },
  },
  plugins: [],
}