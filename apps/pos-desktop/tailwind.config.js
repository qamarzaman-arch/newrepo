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
        // RED & WHITE DESIGN SYSTEM
        primary: {
          DEFAULT: '#E53935',        // Vibrant Red
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#E53935',        // Main Red
          600: '#D32F2F',        // Dark Red
          700: '#C62828',        // Secondary/Dark Red
          800: '#B71C1C',        // Deep Red
          900: '#8B0000',
          foreground: '#FFFFFF',
        },
        // Status Colors
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          light: '#ECFDF5',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        info: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        // Neutral Scale (White & Grays)
        neutral: {
          0: '#FFFFFF',     // Pure White
          50: '#FAFAFA',    // Background
          100: '#F5F5F5',   // Surface
          200: '#EEEEEE',
          300: '#E0E0E0',   // Borders
          400: '#BDBDBD',
          500: '#9E9E9E',   // Disabled
          600: '#757575',
          700: '#616161',
          800: '#424242',   // Text Secondary
          900: '#1A1A1A',   // Text Primary
        },
        // Legacy aliases for backward compatibility (redirect to new system)
        surface: {
          DEFAULT: '#FFFFFF',
          lowest: '#FFFFFF',
          low: '#FAFAFA',
          container: '#F5F5F5',
          high: '#EEEEEE',
          highest: '#E0E0E0',
        },
        // Accent colors
        accent: {
          DEFAULT: '#E53935',
          secondary: '#C62828',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Display sizes (hero elements)
        'display-xl': ['64px', { lineHeight: '1', fontWeight: '800' }],
        'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['30px', { lineHeight: '1.2', fontWeight: '600' }],
        // Heading sizes
        'headline-lg': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        // Body sizes
        'body-xl': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        // Label sizes (small, uppercase)
        'label-lg': ['14px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.025em' }],
        'label-md': ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.025em' }],
        'label-sm': ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.025em' }],
        // Price/number emphasis
        'price-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'price-md': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'price-sm': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        // Touch-friendly spacing scale
        'touch': '48px',      // Minimum touch target
        'touch-lg': '56px',   // Large touch target (cashier buttons)
        'touch-xl': '64px',   // Extra large (primary actions)
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
        // Elevation system
        'none': 'none',
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'md': '0 6px 12px -2px rgba(0, 0, 0, 0.1), 0 3px 6px -1px rgba(0, 0, 0, 0.07)',
        'lg': '0 10px 20px -3px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.08)',
        'xl': '0 20px 40px -5px rgba(0, 0, 0, 0.12), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        // Special shadows
        'glow': '0 0 20px rgba(229, 57, 53, 0.3)',
        'glow-lg': '0 0 40px rgba(229, 57, 53, 0.4)',
        'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        'button': '0 2px 4px rgba(229, 57, 53, 0.2)',
        'button-hover': '0 4px 12px rgba(229, 57, 53, 0.35)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(229, 57, 53, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(229, 57, 53, 0.6)' },
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
    // Custom plugin for touch targets
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
