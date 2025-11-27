/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'compact': '0px',
        'medium': '600px',
        'expanded': '905px',
        'large': '1240px',
        'xlarge': '1440px',
      },
      colors: {
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary-container': 'var(--on-primary-container)',
        surface: 'var(--surface)',
        'on-surface': 'var(--on-surface)',
        'surface-variant': 'var(--surface-variant)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'surface-container': 'var(--surface-container)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        error: 'var(--error)',
        'on-error': 'var(--on-error)',
      },
    },
  },
  plugins: [],
}
