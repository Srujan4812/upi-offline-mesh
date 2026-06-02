/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        surface: '#121217',
        border: 'rgba(255, 255, 255, 0.08)',
        accent: {
          green: '#10b981',
          red: '#ef4444',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          orange: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.15)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.15)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.15)',
      }
    },
  },
  plugins: [],
}
