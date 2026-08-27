import { decimate } from './decimate'

const series = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ value: i, label: `d${i}` }))

describe('decimate', () => {
  it('krátkou řadu nechá být', () => {
    const s = series(10)
    expect(decimate(s, 60)).toEqual(s)
  })

  it('dlouhou řadu zkrátí pod limit', () => {
    expect(decimate(series(365), 60).length).toBeLessThanOrEqual(60)
  })

  it('vždy zachová první a poslední bod', () => {
    const out = decimate(series(365), 60)
    expect(out[0].label).toBe('d0')
    expect(out[out.length - 1].label).toBe('d364')
  })

  it('zachová krajní hodnoty, ne jen každý n-tý bod', () => {
    // Špička uprostřed se nesmí ztratit — jinak graf zamlčí rekord.
    const s = series(200).map((p, i) => (i === 97 ? { ...p, value: 9999 } : p))
    expect(decimate(s, 20).some((p) => p.value === 9999)).toBe(true)
  })

  it('drží pořadí', () => {
    const out = decimate(series(365), 40)
    const labels = out.map((p) => Number(p.label.slice(1)))
    expect([...labels].sort((a, b) => a - b)).toEqual(labels)
  })

  it('nikdy nevrátí duplicitní bod', () => {
    const out = decimate(series(365), 40)
    expect(new Set(out.map((p) => p.label)).size).toBe(out.length)
  })

  it('prázdný vstup nespadne', () => {
    expect(decimate([], 60)).toEqual([])
  })
})
