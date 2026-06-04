// Samostatný babel pro jest testy. Core logika je čisté TS bez React Native,
// takže testy běží pod nodem bez RN/nativewind/reanimated babel řetězce.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['module-resolver', { root: ['./'], alias: { '@': './src' } }],
  ],
}
