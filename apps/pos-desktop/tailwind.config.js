/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // POSLytic Brand — Red
        primary: {
          DEFAULT: '#AA0000',
          50: '#FCE8E8',
          100: '#F5C2C2',
          200: '#E89999',
          300: '#D96E6E',
          400: '#C84545',
          500: '#AA0000',     // Brand red
          600: '#990000',
          700: '#880000',
          800: '#770000',
          900: '#550000',
          foreground: '#FFFFFF',
        },
        // Status colors per brand spec
        success: {
          DEFAULT: '#1DA04D',
          50: '#E6F7EC',
          100: '#C2EBCF',
          light: '#C2EBCF',
          dark: '#178A40',
          500: '#1DA04D',
          600: '#178A40',
          700: '#127434',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          light: '#FEF3C7',
          dark: '#D97706',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          DEFAULT: '#CC0000',
          50: '#FCE8E8',
          100: '#F5C2C2',
          light: '#F5C2C2',
          dark: '#990000',
          500: '#CC0000',
          600: '#AA0000',
          700: '#880000',
        },
        info: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          light: '#DBEAFE',
          dark: '#2563EB',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        // Neutral scale per brand spec
        neutral: {
          0: '#FFFFFF',
          50: '#FBFBFB',     // Brand light bg
          100: '#F2F2F2',
          200: '#E5E5E5',
          300: '#DDDDDD',    // Brand light card
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#6B7280',
          700: '#374151',
          800: '#1F2937',    // Brand dark card
          900: '#111827',    // Brand dark bg
          950: '#1F1F1F',    // Brand deep dark
        },
        surface: {
          DEFAULT: '#FBFBFB',
          lowest: '#FFFFFF',
          low: '#FBFBFB',
          container: '#F2F2F2',
          high: '#E5E5E5',
          highest: '#DDDDDD',
        },
        accent: {
          DEFAULT: '#AA0000',
          secondary: '#880000',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Body sizes per brand: 14-16
        // Sub-heading: 16-18
        // Heading: 18-24
        'display-xl': ['64px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-lg': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '1.3', fontWeight: '700' }],
        'display-sm': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '1.4', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '1.5', fontWeight: '600' }],
        'body-xl': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.01em' }],
        'label-md': ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.01em' }],
        'label-sm': ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.01em' }],
        'price-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'price-md': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'price-sm': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        'touch': '48px',
        'touch-lg': '56px',
        'touch-xl': '64px',
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'none': 'none',
        'xs': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.10)',
        'DEFAULT': '0 2px 6px rgba(0, 0, 0, 0.10)',
        'md': '0 4px 10px rgba(0, 0, 0, 0.10)',
        'lg': '0 8px 20px rgba(0, 0, 0, 0.12)',
        'xl': '0 12px 28px rgba(0, 0, 0, 0.14)',
        '2xl': '0 20px 40px rgba(0, 0, 0, 0.18)',
        'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
        'card': '0 2px 6px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 6px 16px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 4px rgba(170, 0, 0, 0.25)',
        'button-hover': '0 4px 12px rgba(170, 0, 0, 0.35)',
        'glow': '0 0 16px rgba(170, 0, 0, 0.30)',
        'glow-lg': '0 0 32px rgba(170, 0, 0, 0.40)',
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in-bounce': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 16px rgba(170, 0, 0, 0.30)' },
          '50%': { boxShadow: '0 0 32px rgba(170, 0, 0, 0.55)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'spin-slow': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'fade-in-down': 'fade-in-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-in-bounce': 'scale-in-bounce 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'wiggle': 'wiggle 0.3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.touch-target': {
          minHeight: '48px',
          minWidth: '48px',
        },
        '.touch-target-lg': {
          minHeight: '56px',
          minWidth: '56px',
        },
        '.touch-target-xl': {
          minHeight: '64px',
          minWidth: '64px',
        },
      });
    },
  ],
};
