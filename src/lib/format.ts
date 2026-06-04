/**
 * Pomocníci na formátování a porovnávání dat (datum/čas).
 * Všechno bere ISO řetězec (tak datum ukládáme ve WorkoutSession).
 */

const MS_PER_DAY = 86_400_000

/** "1. 6. 2026" */
export function formatDateCZ(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** "pondělí 1. června" */
export function formatLongCZ(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Začátek týdne (pondělí 00:00) pro dané datum. */
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const dayMondayFirst = (d.getDay() + 6) % 7 // Po = 0 … Ne = 6
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dayMondayFirst)
  return d
}

/** Spadá datum do aktuálního (kalendářního) týdne? */
export function isThisWeek(iso: string): boolean {
  const start = startOfWeek(new Date())
  const end = new Date(start.getTime() + 7 * MS_PER_DAY)
  const d = new Date(iso)
  return d >= start && d < end
}

/** Spadá datum do aktuálního měsíce? */
export function isThisMonth(iso: string): boolean {
  const now = new Date()
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
