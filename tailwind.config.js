/** @type {import('tailwindcss').Config} */
// Barvy maji jediny zdroj pravdy v src/theme/tokens.json (cte ho i colors.ts).
const t = require('./src/theme/tokens.json')

// Text je systemove pismo (na iPhonu SF). Na nativu NativeWind vezme prvni
// polozku, zbytek je fallback pro web.
const SYSTEM = ['System', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Appka je dark-only. Bez tohohle se NativeWind na webu opira o prefers-color-scheme
  // a expo-system-ui pak hodi: "Cannot manually set color scheme, as dark mode is type 'media'".
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: t.bg,
        panel: t.panel,
        panel2: t.panel2,
        line: t.line,
        muted: t.muted,
        faint: t.faint,
        accent: t.accent,
        'accent-text': t.accentText,
        optimal: t.optimal,
        warn: t.warn,
        over: t.over,
        danger: t.danger,
        under: t.under,
        pr: t.pr,
        'plate-25': '#E5322D',
        'plate-20': '#2F6FE0',
        'plate-15': '#F5C518',
        'plate-10': '#34A853',
        'plate-5': '#E8EDF2',
        white: t.text,
      },
      fontFamily: {
        // Dve role: systemove pismo na text, zuzene Barlow Condensed na
        // velka cisla a nazvy (jako cisla na kotoucich). Vahu textu ridi
        // font-medium / font-semibold / font-bold.
        sans: SYSTEM,
        display: ['Display', ...SYSTEM],
        'display-bold': ['DisplayBold', ...SYSTEM],
        // Stare nazvy z doby Plus Jakarta Sans - nez se prepisou zbyle obrazovky.
        'sans-medium': SYSTEM,
        'sans-semibold': SYSTEM,
        mono: SYSTEM,
        'mono-semibold': SYSTEM,
      },
    },
  },
  plugins: [],
}
