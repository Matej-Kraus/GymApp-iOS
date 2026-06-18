import { platesForBarbell, DEFAULT_BAR_KG } from './plates'

describe('platesForBarbell', () => {
  test('prázdná osa pro cíl == hmotnost osy', () => {
    const r = platesForBarbell(20)
    expect(r.perSide).toEqual([])
    expect(r.achievableKg).toBe(20)
    expect(r.remainderKg).toBe(0)
    expect(r.belowBar).toBe(false)
  })

  test('cíl pod osou → belowBar', () => {
    const r = platesForBarbell(15)
    expect(r.belowBar).toBe(true)
    expect(r.perSide).toEqual([])
  })

  test('100 kg na olympijské ose = 25+15 na stranu (greedy od největšího)', () => {
    const r = platesForBarbell(100)
    // (100 - 20) / 2 = 40 na stranu = 25 + 15
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ])
    expect(r.achievableKg).toBe(100)
    expect(r.remainderKg).toBe(0)
  })

  test('greedy mix pro 60 kg', () => {
    const r = platesForBarbell(60)
    // 20 na stranu = 1×20
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }])
  })

  test('desetinné kotouče: 62.5 kg', () => {
    const r = platesForBarbell(62.5)
    // 21.25 na stranu = 20 + 1.25
    expect(r.perSide).toEqual([
      { plate: 20, count: 1 },
      { plate: 1.25, count: 1 },
    ])
    expect(r.achievableKg).toBe(62.5)
  })

  test('zbytek když nejde přesně naložit', () => {
    const r = platesForBarbell(61, DEFAULT_BAR_KG)
    // 20.5 na stranu → 20 (zbývá 0.5, nejmenší kotouč 1.25)
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }])
    expect(r.achievableKg).toBe(60)
    expect(r.remainderKg).toBe(1)
  })

  test('vlastní hmotnost osy', () => {
    const r = platesForBarbell(50, 10)
    // (50 - 10) / 2 = 20 na stranu
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }])
    expect(r.achievableKg).toBe(50)
  })
})
