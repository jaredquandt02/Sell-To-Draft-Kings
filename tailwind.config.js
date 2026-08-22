/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        surface: {
          DEFAULT: '#fbfaf7',
          raised: '#f4f1ea',
        },
        edge: {
          DEFAULT: '#e7e3d9',
          strong: '#d3ccbb',
        },
        accent: {
          // Fills: bars, dots, button backgrounds. Pair with dark ink, not white.
          DEFAULT: '#c9a227',
          hover: '#b38f1d',
          // Readable gold for text on a white canvas.
          strong: '#8a6d14',
          muted: 'rgba(201, 162, 39, 0.14)',
        },
        ink: {
          DEFAULT: '#14161a',
          muted: '#5b626d',
          faint: '#8b919b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.035em',
      },
      maxWidth: {
        shell: '1200px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 22, 26, 0.04)',
        lift: '0 4px 16px rgba(20, 22, 26, 0.08)',
      },
    },
  },
  plugins: [],
}
