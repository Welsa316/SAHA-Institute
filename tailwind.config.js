/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#d9e0f0',
          200: '#b3c1e0',
          300: '#8da2d1',
          400: '#6683c1',
          500: '#4064b2',
          600: '#2d4a8e',
          700: '#1e3366',
          800: '#1a2b55',
          900: '#152244',
          950: '#0f1830',
        },
        academic: {
          50: '#f0f7fc',
          100: '#d6ecf8',
          200: '#add9f1',
          300: '#7bc1e6',
          400: '#5badd9',
          500: '#4a9acc',
          600: '#3d7fb0',
          700: '#336690',
          800: '#2b5070',
          900: '#234058',
        },
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
