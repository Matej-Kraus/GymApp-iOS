/**
 * Formátování dat a čísel podle jazyka appky (`@/i18n`) a pomocné funkce
 * na porovnání dat. Data se berou jako ISO řetězec — tak je ukládá
 * WorkoutSession.
 */
import { localeTag } from '@/i18n'

const MS_PER_DAY = 86_400_000

/** "Jun 1, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Mon 1 Jun" — compact, fits a row. */
export function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "Monday 1 June" */
export function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// Kalendářní dny žijí v jádru (`core/dates.ts`) — tady jen průchod, aby
// nebyly dvě kopie téhle logiky, každá s jinou chybou.
export { localDateISO, mondayOf, todayISO } from '@/core'

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

/**
 * Číslo podle jazyka: 82.5 → „82,5" česky, „82.5" anglicky; tisíce odděluje
 * mezera / čárka. `maxDecimals` ořízne desetinná místa (default 1).
 */
export function fmtNum(n: number, maxDecimals = 1): string {
  return n.toLocaleString(localeTag(), { maximumFractionDigits: maxDecimals })
}

/** Série jako „82,5 × 6". Křížek, ne písmeno x. */
export function fmtSet(weight: number, reps: number): string {
  return `${fmtNum(weight, 2)} × ${reps}`
}

/** Kolik celých kalendářních dní uplynulo od data (0 = dnes). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const a = new Date(iso)
  a.setHours(0, 0, 0, 0)
  const b = new Date(now)
  b.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / MS_PER_DAY))
}
