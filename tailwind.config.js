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
        // LUXURY INSTRUMENT — grafitový základ, šampaňsko-bronzový akcent.
        bg: '#0B0B0D', // grafit (teplejší než čistá čerň)
        card: '#16161A', // matný kov
        card2: '#212128', // vyvýšený povrch
        cardTop: '#1C1C22', // světlejší okraj gradientu karty (brushed metal)
        muted: '#8A8A93',
        accent: '#C8A961', // šampaň / bronz
        accentSoft: '#3A331F', // tlumené bronzové pozadí (chip/badge)
        danger: '#E5484D', // rafinovanější červená
        // Teple bílá místo ostré #FFF — propisuje se do všech `text-white`.
        white: '#F4F1EA',
      },
      fontFamily: {
        // Display = Fraunces (luxusní high-contrast serif). Body zůstává systémový (SF/Roboto).
        display: ['FrauncesBold'],
        'display-light': ['Fraunces'],
      },
    },
  },
  plugins: [],
}
