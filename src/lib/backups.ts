import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  autoSnapshotReason,
  backupMetaFor,
  deserialize,
  hasUserData,
  snapshotFilename,
  snapshotsToPrune,
  sortSnapshots,
  type AppData,
  type BackupMeta,
  type SnapshotInfo,
  type SnapshotReason,
} from '@/core'
import { saveJson, snapshotFolder } from './platform'
import { todayISO } from './format'

/**
 * Automatické snapshoty dat. Rozhoduje jádro (`core/backup.ts`), tady jen
 * soubory a metadata. Všechno je best-effort: selhaná záloha nesmí shodit
 * appku ani zdržet ukládání — jen se zaloguje.
 */

const META_KEY = 'workout-tracker:backup-meta'

let metaCache: BackupMeta | null | undefined
// Zápisy za sebou — dva snapshoty najednou by si přepisovaly metadata.
let queue: Promise<unknown> = Promise.resolve()

function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(() => undefined)
  return run
}

async function readMeta(): Promise<BackupMeta | null> {
  if (metaCache !== undefined) return metaCache
  try {
    const raw = await AsyncStorage.getItem(META_KEY)
    metaCache = raw ? (JSON.parse(raw) as BackupMeta) : null
  } catch {
    metaCache = null
  }
  return metaCache
}

async function writeSnapshot(data: AppData, reason: SnapshotReason, now: Date): Promise<SnapshotInfo> {
  const name = snapshotFilename(now, reason)
  await snapshotFolder.write(name, JSON.stringify(data))
  const all = await snapshotFolder.list()
  await Promise.all(snapshotsToPrune(all).map((n) => snapshotFolder.remove(n)))
  return { id: name, createdAt: now.toISOString(), reason }
}

/** Zavolat po změně dat (debounced). Udělá snapshot, jen když je důvod. */
export function maybeAutoSnapshot(data: AppData): Promise<SnapshotInfo | null> {
  return serial(async () => {
    const now = new Date()
    const reason = autoSnapshotReason(data, await readMeta(), now)
    if (!reason) return null
    const info = await writeSnapshot(data, reason, now)
    metaCache = backupMetaFor(data, now)
    await AsyncStorage.setItem(META_KEY, JSON.stringify(metaCache))
    return info
  }).catch((e) => {
    console.warn('Auto backup failed', e)
    return null
  })
}

/** Pojistka před přepsáním dat. Metadata nemění — další auto snapshot proběhne normálně. */
export function safetySnapshot(data: AppData, reason: 'before-restore' | 'before-reset') {
  if (!hasUserData(data)) return Promise.resolve(null)
  return serial(() => writeSnapshot(data, reason, new Date())).catch((e) => {
    console.warn('Safety backup failed', e)
    return null
  })
}

export interface SnapshotSummary extends SnapshotInfo {
  sessions: number
}

/** Seznam snapshotů od nejnovějšího, s počtem tréninků (čte soubory). */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  const infos = sortSnapshots(await snapshotFolder.list())
  return Promise.all(
    infos.map(async (info) => {
      try {
        const data = deserialize(await snapshotFolder.read(info.id))
        return { ...info, sessions: data.sessions.filter((s) => !s.isSample).length }
      } catch {
        return { ...info, sessions: 0 }
      }
    }),
  )
}

export async function loadSnapshot(id: string): Promise<AppData> {
  return deserialize(await snapshotFolder.read(id))
}

/** Export mimo telefon (share sheet → Soubory / iCloud Drive). Vrací text pro UI. */
export function exportBackup(data: AppData): Promise<string> {
  // Datum lokálně — toISOString() by po půlnoci ukázalo včerejšek.
  return saveJson(`workout-backup-${todayISO()}.json`, JSON.stringify(data, null, 2))
}

export const snapshotLocation = snapshotFolder.location
