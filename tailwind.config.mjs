import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF8F5',   // Warm Pearl
          100: '#F4EFE6',  // Warm Ivory
          200: '#E7DDD0',  // Soft Champagne
          300: '#D5C3AE',  // Golden Sand
          400: '#BEA488',  // Muted Bronze
          500: '#A68868',  // Brushed Gold Accent
          600: '#8A6D4F',  // Deep Ochre
          700: '#6E553D',  // Rich Espresso
          800: '#433426',  // Dark Ebony
          900: '#1C1917',  // Deep Charcoal
          950: '#0C0A09',  // Obsidian
        },
        gold: {
          light: '#F3E5C8',
          DEFAULT: '#D4AF37',
          dark: '#AA820A',
        }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxurious: '0.15em',
        widest: '0.25em',
      },
      boxShadow: {
        lux: '0 20px 40px -15px rgba(28, 25, 23, 0.07), 0 0 15px rgba(212, 175, 55, 0.05)',
        glow: '0 0 25px rgba(212, 175, 55, 0.25)',
      }
    },
  },
  plugins: [
    typography,
  ],
};
