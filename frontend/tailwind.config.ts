import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans Tamil', 'Noto Sans Sinhala', 'sans-serif'],
      },
      colors: {
        kapruka: {
          primary: '#4A148C',
          purple: '#4B2187',
          orange: '#FF9800',
          green: '#10B981',
          dark: '#1F2937',
          surface: '#F9FAFB',
          light: '#F4F0FA'
        }
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(74, 20, 140, 0.2)',
        'glow-lg': '0 0 60px -15px rgba(74, 20, 140, 0.3)',
      }
    }
  },
  plugins: [],
} satisfies Config
