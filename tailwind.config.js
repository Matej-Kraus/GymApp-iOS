/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        card: '#1C1C1E',
        card2: '#2C2C2E',
        muted: '#8E8E93',
        accent: '#C6FF00',
        danger: '#FF453A',
      },
      fontFamily: {
        display: ['SpaceGrotesk'],
      },
    },
  },
  plugins: [],
}
