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
        // PLATE CODE — viz src/theme/colors.ts (jeden zdroj pravdy, tohle je jeho zrcadlo).
        bg: '#0E1116',
        panel: '#161B22',
        panel2: '#1D242E',
        line: '#252D38',
        muted: '#7D8794',
        faint: '#4A5462',
        accent: '#2F6FE0', // 20kg kotouc
        // Semantika objemu
        under: '#7D8794',
        optimal: '#34A853',
        warn: '#F5C518',
        over: '#E5322D',
        danger: '#E5322D',
        pr: '#F5C518',
        // Barvy kotoucu pro primy zapis v UI
        'plate-25': '#E5322D',
        'plate-20': '#2F6FE0',
        'plate-15': '#F5C518',
        'plate-10': '#34A853',
        'plate-5': '#E8EDF2',
        // Studena bila misto ostre #FFF — propisuje se do vsech `text-white`.
        white: '#E8EDF2',
      },
      fontFamily: {
        // Display = Archivo Black (tezky industrialni grotesk, verzalky).
        // Body = Archivo. Data/cisla = IBM Plex Mono (tabulkove).
        display: ['ArchivoBlack'],
        sans: ['Archivo'],
        'sans-medium': ['ArchivoMedium'],
        'sans-semibold': ['ArchivoSemiBold'],
        mono: ['PlexMono'],
        'mono-semibold': ['PlexMonoSemiBold'],
      },
    },
  },
  plugins: [],
}
