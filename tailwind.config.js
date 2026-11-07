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
        zinc: {
          50: 'rgb(var(--color-zinc-50) / <alpha-value>)',
          100: 'rgb(var(--color-zinc-100) / <alpha-value>)',
          200: 'rgb(var(--color-zinc-200) / <alpha-value>)',
          300: 'rgb(var(--color-zinc-300) / <alpha-value>)',
          400: 'rgb(var(--color-zinc-400) / <alpha-value>)',
          500: 'rgb(var(--color-zinc-500) / <alpha-value>)',
          600: 'rgb(var(--color-zinc-600) / <alpha-value>)',
          700: 'rgb(var(--color-zinc-700) / <alpha-value>)',
          800: 'rgb(var(--color-zinc-800) / <alpha-value>)',
          850: 'rgb(var(--color-zinc-850) / <alpha-value>)',
          900: 'rgb(var(--color-zinc-900) / <alpha-value>)',
          950: 'rgb(var(--color-zinc-950) / <alpha-value>)',
        },
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
