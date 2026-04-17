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
        primary: {
          DEFAULT: '#00513f',
          container: '#006b54',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#753229',
          container: '#8b4035',
          foreground: '#ffffff',
        },
        surface: {
          DEFAULT: '#f8faf7',
          container: '#edeeec',
          lowest: '#ffffff',
        },
        accent: {
          DEFAULT: '#60a5fa',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '800' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 16px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 24px rgba(0, 0, 0, 0.12)',
        'large': '0 8px 40px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
