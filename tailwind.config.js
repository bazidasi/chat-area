/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fibonacci: {
          magenta: '#d6199b',
          blue: '#2979ff',
        },
      },
    },
  },
  plugins: [],
}
