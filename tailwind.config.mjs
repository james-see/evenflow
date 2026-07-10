/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        evenflow: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8ec1ff',
          400: '#599cff',
          500: '#3377ff',
          600: '#1c55f5',
          700: '#1540e1',
          800: '#1834b6',
          900: '#19308f',
          950: '#141d57',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};