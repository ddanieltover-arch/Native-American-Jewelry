/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — warm earth / turquoise / bone
        brand: {
          obsidian:  '#0e0c0a',
          charcoal:  '#1c1916',
          umber:     '#3d2c1e',
          sienna:    '#8b5e3c',
          sand:      '#c9a97a',
          bone:      '#f0e8d8',
          parchment: '#faf6ef',
          turquoise: '#3da8a0',
          teal:      '#2a7f78',
          gold:      '#c8973a',
          gold2:     '#e4b55a',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'Palatino Linotype', 'serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-in-r': 'slideInRight 0.4s ease forwards',
        'slide-out-r':'slideOutRight 0.3s ease forwards',
        'shimmer':    'shimmer 1.8s infinite',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-gold':   '0 0 30px rgba(200, 151, 58, 0.25)',
        'glow-teal':   '0 0 30px rgba(61, 168, 160, 0.2)',
        'card':        '0 2px 12px rgba(14,12,10,0.08), 0 1px 3px rgba(14,12,10,0.04)',
        'card-hover':  '0 8px 32px rgba(14,12,10,0.14), 0 2px 8px rgba(14,12,10,0.06)',
        'drawer':      '-4px 0 48px rgba(14,12,10,0.2)',
      },
    },
  },
  plugins: [],
};
