/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0F',
          surface: '#11111A',
          surface2: '#15151F',
          elevated: '#1A1A26',
          hover: '#1E1E2C',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.12)',
          violet: 'rgba(168,85,247,0.3)',
        },
        text: {
          primary: '#F4F4F8',
          secondary: '#A1A1B5',
          tertiary: '#6B6B7E',
          muted: '#4A4A5C',
        },
        accent: {
          violet: '#A855F7',
          'violet-soft': 'rgba(168,85,247,0.15)',
          'violet-glow': 'rgba(168,85,247,0.35)',
          pink: '#EC4899',
          green: '#10B981',
          'green-soft': 'rgba(16,185,129,0.15)',
          orange: '#F97316',
          cyan: '#06B6D4',
          blue: '#3B82F6',
          yellow: '#EAB308',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        'gradient-violet-pink': 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
        'gradient-orange': 'linear-gradient(135deg, #F97316 0%, #EAB308 100%)',
        'gradient-pink': 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
        'gradient-green': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'gradient-violet': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
        'gradient-hero':
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(168,85,247,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 0%, rgba(236,72,153,0.12) 0%, transparent 60%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      boxShadow: {
        glow: '0 0 24px rgba(168,85,247,0.25)',
        'glow-strong': '0 0 40px rgba(168,85,247,0.4)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
