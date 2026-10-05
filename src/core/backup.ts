import type { AppData } from './types'
import { serialize } from './storage'

/**
 * ZÁLOHY — čistá logika bez souborů.
 *
 * Dvě vrstvy ochrany:
 * 1. Automatické snapshoty v telefonu (po tréninku, aspoň jednou týdně,
 *    před obnovou / smazáním). Chrání před omylem v appce a jsou součástí
 *    iCloud zálohy telefonu — ne před ztrátou telefonu.
 * 2. Kopie mimo telefon (export do Souborů / iCloud Drive). Tu za uživatele
 *    udělat nejde (free účet nemá iCloud entitlement), takže jen hlídáme,
 *    jak je stará, a připomínáme ji.
 *
 * Soubory, metadata a časovač řeší `src/lib/backups.ts`.
 */

export type SnapshotReason = 'session' | 'weekly' | 'before-restore' | 'before-reset'

export interface SnapshotInfo {
  /** Název souboru — zároveň id. Lexikograficky řazený podle času. */
  id: string
  /** ISO čas vzniku (UTC). */
  createdAt: string
  reason: SnapshotReason
}

/** Co si pamatujeme o posledním automatickém snapshotu. */
export interface BackupMeta {
  lastAt: string
  sessionsKey: string
  contentHash: string
}

export const AUTO_SNAPSHOT_KEEP = 10
export const SAFETY_SNAPSHOT_KEEP = 5
export const WEEKLY_SNAPSHOT_DAYS = 7
/** Po kolika dnech bez kopie mimo telefon začneme připomínat. */
export const OFF_PHONE_STALE_DAYS = 14
/** Pod tímhle počtem vlastních tréninků nemá smysl otravovat. */
export const OFF_PHONE_MIN_SESSIONS = 3

const MS_PER_DAY = 86_400_000
const REASONS: SnapshotReason[] = ['session', 'weekly', 'before-restore', 'before-reset']
const FILE_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z_([a-z-]+)\.json$/

/** `2026-10-05T14-03-22Z_session.json` — dvojtečky iOS Soubory nesnesou. */
export function snapshotFilename(now: Date, reason: SnapshotReason): string {
  const iso = now.toISOString().slice(0, 19).replace(/:/g, '-')
  return `${iso}Z_${reason}.json`
}

export function parseSnapshotFilename(name: string): SnapshotInfo | null {
  const m = FILE_RE.exec(name)
  if (!m) return null
  const reason = m[5] as SnapshotReason
  if (!REASONS.includes(reason)) return null
  return { id: name, createdAt: `${m[1]}T${m[2]}:${m[3]}:${m[4]}.000Z`, reason }
}

/** Seřadí platné snapshoty od nejnovějšího, cizí soubory ignoruje. */
export function sortSnapshots(names: string[]): SnapshotInfo[] {
  return names
    .map(parseSnapshotFilename)
    .filter((s): s is SnapshotInfo => s !== null)
    .sort((a, b) => b.id.localeCompare(a.id))
}

/** Které snapshoty smazat: automatických nechá 10, pojistných (before-*) 5. */
export function snapshotsToPrune(names: string[]): string[] {
  const sorted = sortSnapshots(names)
  const auto = sorted.filter((s) => !s.reason.startsWith('before-'))
  const safety = sorted.filter((s) => s.reason.startsWith('before-'))
  return [...auto.slice(AUTO_SNAPSHOT_KEEP), ...safety.slice(SAFETY_SNAPSHOT_KEEP)].map((s) => s.id)
}

/** Vlastní (ne ukázková) data — jen ta má smysl chránit. */
function userSessions(data: AppData) {
  return data.sessions.filter((s) => !s.isSample)
}

export function hasUserData(data: AppData): boolean {
  return (
    userSessions(data).length > 0 ||
    data.splits.some((s) => !s.isSample) ||
    data.customExercises.length > 0 ||
    data.bodyWeightLog.length > 0
  )
}

/** Mění se přidáním / smazáním / úpravou tréninku, ne nastavením. */
export function sessionsKey(data: AppData): string {
  const own = userSessions(data)
  const last = own.reduce<string>((acc, s) => (s.date > acc ? s.date : acc), '')
  return `${own.length}:${last}:${contentHash(JSON.stringify(own))}`
}

/** djb2 — stačí na „změnilo se něco?", ne na bezpečnost. */
export function contentHash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function backupMetaFor(data: AppData, now: Date): BackupMeta {
  return {
    lastAt: now.toISOString(),
    sessionsKey: sessionsKey(data),
    contentHash: contentHash(serialize(data)),
  }
}

/**
 * Je čas na automatický snapshot? `null` = ne.
 * - změnily se tréninky → hned (typicky právě dokončený trénink)
 * - změnilo se cokoli jiného a poslední snapshot je starší než týden → týdenní
 */
export function autoSnapshotReason(
  data: AppData,
  meta: BackupMeta | null,
  now: Date,
): SnapshotReason | null {
  if (!hasUserData(data)) return null
  if (!meta) return 'session'
  if (sessionsKey(data) !== meta.sessionsKey) return 'session'
  const ageDays = (now.getTime() - new Date(meta.lastAt).getTime()) / MS_PER_DAY
  if (ageDays >= WEEKLY_SNAPSHOT_DAYS && contentHash(serialize(data)) !== meta.contentHash) {
    return 'weekly'
  }
  return null
}

export interface OffPhoneStatus {
  /** Celé dny od posledního exportu, `null` = nikdy. */
  daysAgo: number | null
  /** Připomenout? */
  stale: boolean
}

export function offPhoneBackupStatus(data: AppData, now: Date): OffPhoneStatus {
  const last = data.settings.lastExportAt
  const daysAgo = last ? Math.max(0, Math.floor((now.getTime() - new Date(last).getTime()) / MS_PER_DAY)) : null
  const enoughData = userSessions(data).length >= OFF_PHONE_MIN_SESSIONS
  return { daysAgo, stale: enoughData && (daysAgo === null || daysAgo >= OFF_PHONE_STALE_DAYS) }
}

/** Ukázat připomínku na dashboardu? Jako `stale`, jen respektuje odložení. */
export function showBackupReminder(data: AppData, now: Date): boolean {
  const until = data.settings.backupReminderSnoozedUntil
  if (until && new Date(until).getTime() > now.getTime()) return false
  return offPhoneBackupStatus(data, now).stale
}

/** Odložení připomínky o pár dní — ne napořád, data pořád nejsou v bezpečí. */
export function snoozeBackupReminder(now: Date, days = 3): string {
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString()
}

/** „today" / „yesterday" / „5 days ago" / „never". */
export function daysAgoLabel(daysAgo: number | null): string {
  if (daysAgo === null) return 'never'
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return 'yesterday'
  return `${daysAgo} days ago`
}
