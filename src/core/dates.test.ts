import { localDateISO, todayISO, mondayOf } from './dates'

describe('localDateISO', () => {
  it('půlnoc lokálního času zůstává týmž dnem', () => {
    // V CEST je 27. 8. 00:00 rovno 26. 8. 22:00 UTC — toISOString() by
    // vrátil včerejšek. Přesně tahle chyba ukazovala „dnešek" o den zpět.
    const midnight = new Date(2026, 7, 27, 0, 0, 0, 0)
    expect(localDateISO(midnight)).toBe('2026-08-27')
  })

  it('poslední minuta dne taky', () => {
    expect(localDateISO(new Date(2026, 7, 27, 23, 59, 59))).toBe('2026-08-27')
  })

  it('bere i ISO řetězec', () => {
    expect(localDateISO('2026-08-27T12:00:00.000Z')).toBe('2026-08-27')
  })

  it('doplňuje nuly', () => {
    expect(localDateISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('todayISO', () => {
  it('vrací dnešní lokální datum', () => {
    const now = new Date()
    expect(todayISO()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`,
    )
  })
})

describe('mondayOf', () => {
  it('pondělí zůstává pondělím', () => {
    expect(mondayOf('2026-08-24T10:00:00')).toBe('2026-08-24')
  })

  it('neděle patří do týdne, který začal v pondělí', () => {
    expect(mondayOf('2026-08-30T10:00:00')).toBe('2026-08-24')
  })

  it('trénink krátce po půlnoci nespadne do minulého týdne', () => {
    // Pondělí 00:30 lokálně. S toISOString() by to bylo ještě neděle UTC
    // a týden by se počítal o jeden zpátky.
    expect(mondayOf(new Date(2026, 7, 24, 0, 30).toISOString())).toBe('2026-08-24')
  })
})
