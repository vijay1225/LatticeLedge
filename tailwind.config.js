/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#eae0d0',
          300: '#dac8ad',
          800: '#2b231d',
          900: '#1c1612',
          950: '#120d0a',
        },
        hogwarts: {
          gold: '#d4af37',
          scarlet: '#740001',
          silver: '#aaaaaa',
          emerald: '#1a472a',
          bronze: '#946b2d',
          navy: '#0e1a40'
        }
      }
    },
  },
  plugins: [],
}
