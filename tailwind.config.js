/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'Oswald', 'sans-serif'],
        body: ['Rajdhani', 'Manrope', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        felt: { 900: '#080f18', 800: '#0a1628', 700: '#0d1b2a', 600: '#13263c' },
        chalk: { 400: '#9ab0c8', 300: '#c0c0c0', 200: '#e8e8e8' },
        cue: { 600: '#9f833c', 500: '#c9a84c', 400: '#e0bf6b' },
        flash: { 600: '#0097cc', 500: '#00BFFF', 400: '#56d6ff' },
        ivory: { 100: '#f3f5f8', 200: '#dce1ea' },
        rail: { 800: '#31140f', 700: '#4a1d15' },
      },
    },
  },
  plugins: [],
}

