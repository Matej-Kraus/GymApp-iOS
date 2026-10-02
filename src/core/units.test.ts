import { kgToLb, lbToKg, fromDisplayWeight, toDisplayWeight, formatWeight, formatVolume } from './units'

test('kgToLb/lbToKg jsou navzájem inverzní', () => {
  expect(kgToLb(lbToKg(100))).toBeCloseTo(100, 6)
})

test('toDisplayWeight/fromDisplayWeight round-trip pro lb', () => {
  const kg = 102.5
  const displayed = toDisplayWeight(kg, 'lb')
  expect(fromDisplayWeight(displayed, 'lb')).toBeCloseTo(kg, 0)
})

test('toDisplayWeight pro kg vrací hodnotu beze změny (jen zaokrouhlení)', () => {
  expect(toDisplayWeight(100, 'kg')).toBe(100)
})

test('fromDisplayWeight(0, "lb") === 0', () => {
  expect(fromDisplayWeight(0, 'lb')).toBe(0)
})

test('formatWeight formátuje kg', () => {
  expect(formatWeight(100, 'kg')).toBe('100 kg')
})

test('formatWeight formátuje lb', () => {
  expect(formatWeight(100, 'lb')).toBe('220.5 lb')
})

test('formatVolume zaokrouhlí na celé číslo a oddělí tisíce', () => {
  expect(formatVolume(1234.6, 'kg')).toBe(`${(1235).toLocaleString('cs-CZ')} kg`)
})

test('formatVolume převede kg na lb', () => {
  expect(formatVolume(1000, 'lb')).toBe(`${Math.round(kgToLb(1000)).toLocaleString('cs-CZ')} lb`)
})
