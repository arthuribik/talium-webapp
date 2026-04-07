/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#d9e4ff',
          200: '#b8cfff',
          300: '#8aadff',
          400: '#5c87fc',
          500: '#2a65ff',
          600: '#1f50db',
          700: '#1a41b8',
          800: '#1a368f',
          900: '#152c70',
        },
      },
    },
  },
  plugins: [],
}

