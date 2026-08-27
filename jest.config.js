// Testy core logiky a úložiště běží pod nodem (žádný RN runtime není potřeba).
//
// Pevná zóna schválně: appka počítá s LOKÁLNÍMI kalendářními dny a chyby
// s posunem (půlnoc v CEST = předchozí den v UTC) by se v UTC runneru
// vůbec neprojevily.
process.env.TZ = process.env.TZ ?? 'Europe/Prague'

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './jest.babel.js' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
