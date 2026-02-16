/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Monochrome Theme
        bg: {
          primary: '#000000',
          secondary: '#0A0A0A',
          tertiary: '#141414',
          elevated: '#1A1A1A',
        },
        card: {
          bg: '#0A0A0A',
          border: '#1A1A1A',
        },
        glass: {
          DEFAULT: 'rgba(10, 10, 10, 0.95)',
          hover: 'rgba(20, 20, 20, 0.95)',
          border: '#1A1A1A',
          'border-hover': '#2A2A2A',
        },
        accent: {
          primary: '#FFFFFF',
          green: '#22C55E',
          orange: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#999999',
          tertiary: '#666666',
          disabled: '#444444',
        },
        separator: {
          DEFAULT: '#1A1A1A',
          opaque: '#2A2A2A',
        },
        tg: {
          bg: 'var(--tg-theme-bg-color, #000000)',
          text: 'var(--tg-theme-text-color, #FFFFFF)',
          hint: 'var(--tg-theme-hint-color, #666666)',
          link: 'var(--tg-theme-link-color, #FFFFFF)',
          button: 'var(--tg-theme-button-color, #FFFFFF)',
          'button-text': 'var(--tg-theme-button-text-color, #000000)',
          'secondary-bg': 'var(--tg-theme-secondary-bg-color, #0A0A0A)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        'large-title': ['34px', { lineHeight: '41px', fontWeight: '700' }],
        'title-1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'title-2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'title-3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption-1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'caption-2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'tab-bar': '88px',
      },
      borderRadius: {
        'button': '12px',
        'card': '20px',
        'modal': '24px',
        'chip': '9999px',
        'input': '12px',
        'full': '9999px',
        '2.5xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'modal': '0 -4px 32px rgba(0, 0, 0, 0.6)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.1)',
      },
      height: {
        'button-sm': '40px',
        'button-md': '48px',
        'button-lg': '56px',
        'button-xl': '56px',
        'input': '56px',
        'tab-bar': '64px',
      },
      minHeight: {
        'touch': '44px',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
        'scale-in': 'scaleIn 100ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        'gradient-orange': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
