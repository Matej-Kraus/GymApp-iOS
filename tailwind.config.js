/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Appka je dark-only. Bez tohohle se NativeWind na webu opira o prefers-color-scheme
  // a expo-system-ui pak hodi: "Cannot manually set color scheme, as dark mode is type 'media'".
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Viz src/theme/colors.ts - tam je zdroj pravdy, tohle je jeho zrcadlo.
        bg: '#070A08',
        panel: '#101511',
        panel2: '#18201A',
        line: '#232C26',
        muted: '#8A9690',
        faint: '#5A665F',
        accent: '#00E676',
        'accent-text': '#04140B',
        optimal: '#00E676',
        warn: '#FFC53D',
        over: '#FF4D4F',
        danger: '#FF4D4F',
        under: '#5A665F',
        pr: '#00E676',
        // Barvy kotoucu pro primy zapis v UI
        'plate-25': '#E5322D',
        'plate-20': '#2F6FE0',
        'plate-15': '#F5C518',
        'plate-10': '#34A853',
        'plate-5': '#E8EDF2',
        white: '#ECF2ED',
      },
      fontFamily: {
        // Jedna rodina, hierarchii nese velikost a vaha - jako Whoop, Nike, Apple Fitness.
        // Nazvy trid zustavaji, aby se zmena propsala do vsech obrazovek naraz.
        sans: ['Jakarta'],
        display: ['JakartaExtraBold'], // nadpisy a prerostla cisla
        'display-bold': ['JakartaBold'],
        'sans-medium': ['JakartaMedium'],
        'sans-semibold': ['JakartaSemiBold'],
        mono: ['JakartaMedium'], // drobne popisky
        'mono-semibold': ['JakartaBold'], // cisla ve statistikach
      },
    },
  },
  plugins: [],
}
