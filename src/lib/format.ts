/**
 * Date formatting and comparison helpers.
 * Everything takes an ISO string — that's how WorkoutSession stores dates.
 */

const MS_PER_DAY = 86_400_000

/** "Jun 1, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Mon 1 Jun" — compact, fits a row. */
export function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "Monday 1 June" */
export function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Local YYYY-MM-DD. NOT toISOString() — that's UTC and shifts the day. */
export function todayISO(date: Date = new Date()): string {
  return localDateISO(date)
}

/** Local calendar date of a Date/ISO string, as YYYY-MM-DD. */
export function localDateISO(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Start of week (Monday 00:00) for a given date. */
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const dayMondayFirst = (d.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dayMondayFirst)
  return d
}

/** Does the date fall in the current calendar week? */
export function isThisWeek(iso: string): boolean {
  const start = startOfWeek(new Date())
  const end = new Date(start.getTime() + 7 * MS_PER_DAY)
  const d = new Date(iso)
  return d >= start && d < end
}

/** Does the date fall in the current month? */
export function isThisMonth(iso: string): boolean {
  const now = new Date()
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
