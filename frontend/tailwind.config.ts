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
          primary: '#FF1F8F',
          purple: '#a855f7',
          orange: '#FF9800',
          green: '#10B981',
          dark: '#1a1a2e',
          surface: '#fdf4ff',
          light: '#F4F0FA',
          pink: '#FF1F8F',
        }
      },
      boxShadow: {
        'glow':    '0 0 40px -10px rgba(255, 31, 143, 0.25)',
        'glow-lg': '0 0 60px -15px rgba(255, 31, 143, 0.4)',
        'orb':     '0 25px 70px rgba(244, 114, 182, 0.55), 0 10px 30px rgba(200, 132, 252, 0.3)',
        'card':    '0 4px 24px rgba(0, 0, 0, 0.06)',
        'btn':     '0 4px 16px rgba(255, 0, 124, 0.45)',
      },
    }
  },
  plugins: [],
} satisfies Config
