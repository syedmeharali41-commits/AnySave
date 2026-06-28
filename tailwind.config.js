/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        'neon-cyan':     '#06b6d4',
        'electric-purple':'#a855f7',
        'surface':       '#111113',
        'surface-hover': '#1a1a1f',
        'base-bg':       '#0a0a0a',
      },
      boxShadow: {
        'neon-cyan':   '0 0 15px rgba(6,182,212,0.6)',
        'neon-purple': '0 0 15px rgba(168,85,247,0.6)',
        'neon-green':  '0 0 15px rgba(34,197,94,0.5)',
        'neon-red':    '0 0 15px rgba(239,68,68,0.5)',
        'glow-sm':     '0 0 10px rgba(6,182,212,0.4)',
        'glow-md':     '0 0 20px rgba(6,182,212,0.5)',
        'glow-lg':     '0 0 30px rgba(6,182,212,0.6)',
      },
      animation: {
        'shine':        'shine 1.8s ease-in-out infinite',
        'pulse-glow':   'pulse-glow 2.5s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
        'scan':         'scan 1.5s ease-in-out infinite',
        'gradient-x':   'gradient-x 4s ease infinite',
        'toast-in':     'toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        'shine': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(6,182,212,0.4)' },
          '50%':      { boxShadow: '0 0 35px rgba(6,182,212,0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'scan': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0.7' },
          '50%':  { opacity: '1' },
          '100%': { transform: 'translateX(200%)', opacity: '0.7' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'toast-in': {
          'from': { opacity: '0', transform: 'translateX(100%) scale(0.92)' },
          'to':   { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      backgroundSize: {
        '200': '200% 200%',
      },
    },
  },
  plugins: [],
}
