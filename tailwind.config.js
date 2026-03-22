/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#0a0a0f',
          charcoal: '#12121a',
          blue: '#00f0ff',
          pink: '#ff00ff',
          violet: '#7b2cbf',
          cyan: '#00ffff',
          lime: '#39ff14',
          amber: '#ffbf00',
        },
        surface: {
          DEFAULT: '#0e0e13',
          container: '#19191f',
          low: '#131319',
          high: '#1f1f26',
          highest: '#454550',
          variant: 'rgba(160, 160, 180, 0.6)',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 10px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-pink': '0 0 10px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)',
        'neon-cyan': '0 0 10px #00ffff, 0 0 20px rgba(0, 255, 255, 0.3)',
        'neon-lime': '0 0 10px #39ff14, 0 0 20px rgba(57, 255, 20, 0.3)',
        'neon-violet': '0 0 10px #7b2cbf, 0 0 20px rgba(123, 44, 191, 0.3)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.1s infinite',
        'scanline': 'scanline 10s linear infinite',
        'glitch': 'glitch 0.2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px var(--tw-shadow-color)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 10px var(--tw-shadow-color)' },
        },
        'flicker': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.95 },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        }
      }
    },
  },
  plugins: [],
}
