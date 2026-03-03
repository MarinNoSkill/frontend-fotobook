/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de colores personalizada
        'deep-black': '#FFFFFF',
        'near-black': '#F9FAFB',
        'purple-deep': '#003300',
        'purple-dark': '#00AA00',
        'neon-purple': '#39FF14',
        'purple-light': '#66FF44',
        'gray-muted': '#4B5563',
        'gray-soft': '#6B7280',
        
        neon: {
          green: '#39FF14',
          lime: '#00ff88',
          glow: 'rgba(57, 255, 20, 0.4)',
        },
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        bausch: ['BAUHS93', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: ['Bebas Neue', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(57, 255, 20, 0.3)',
        'glow': '0 0 20px rgba(57, 255, 20, 0.4)',
        'glow-lg': '0 0 30px rgba(57, 255, 20, 0.6)',
        'neon-green': '0 0 20px rgba(57, 255, 20, 0.6)',
      },
      animation: {
        fadeInUp: 'fadeInUp 250ms ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(6px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [
    function ({ addBase, addUtilities, theme }) {
      // Importar Bebas Neue desde Google Fonts
      addBase({
        '@import': 'url("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap");',
      });

      // Utilidades personalizadas
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-green': {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(57, 255, 20, 0.5)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(57, 255, 20, 0.8)',
            },
          },
        },
        '.smooth-scroll': {
          'scroll-behavior': 'smooth',
        },
        '.boletas-fade': {
          'mask-image': 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          '-webkit-mask-image': 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        },
      });
    },
  ],
};
