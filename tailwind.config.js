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
          50: '#e6edff',
          100: '#b3c7ff',
          300: '#4d7fff',
          500: '#2966FF',
          600: '#1e4dcc',
          700: '#1a3fa8',
        },
      },
    },
  },
  plugins: [],
}

