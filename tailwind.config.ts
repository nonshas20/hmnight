import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF3366',
          dark: '#CC2952',
          light: '#FF6699',
        },
        secondary: {
          DEFAULT: '#3366FF',
          dark: '#2952CC',
          light: '#6699FF',
        },
        accent: {
          DEFAULT: '#FFCC33',
          dark: '#E6B800',
          light: '#FFD966',
        },
        background: {
          DEFAULT: '#F8F9FA',
          dark: '#121212',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        display: ['var(--font-montserrat)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
}
export default config
