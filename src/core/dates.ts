/**
 * Kalendářní dny v LOKÁLNÍM čase.
 *
 * `toISOString().slice(0, 10)` je UTC, ne lokální den. V ČR (UTC+1/+2) to
 * znamená, že všechno mezi půlnocí a 1:00 (v létě 2:00) spadne na včerejšek —
 * trénink v 00:30 se započítal do minulého týdne a „dnešek" na dashboardu
 * ukazoval předchozí den. Odsud se to bere správně.
 */

/** Lokální YYYY-MM-DD z Date nebo ISO řetězce. */
export function localDateISO(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Dnešní lokální datum jako YYYY-MM-DD. */
export function todayISO(date: Date = new Date()): string {
  return localDateISO(date)
}

/** Pondělí toho týdne, do kterého datum patří (jako YYYY-MM-DD). */
export function mondayOf(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : new Date(input)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return localDateISO(d)
}
