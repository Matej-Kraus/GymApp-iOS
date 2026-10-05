import { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Banner, Button, Card, cn, tnum } from '@/components/ui'
import { DATA_VERSION, daysAgoLabel, deserialize, offPhoneBackupStatus, type SnapshotReason } from '@/core'
import { confirm, pickJson } from '@/lib/platform'
import { exportBackup, listSnapshots, loadSnapshot, snapshotLocation, type SnapshotSummary } from '@/lib/backups'
import { formatShort } from '@/lib/format'
import { useAppState } from '@/state/AppStateContext'
import { colors } from '@/theme/colors'

const REASON_LABEL: Record<SnapshotReason, string> = {
  session: 'After a session',
  weekly: 'Weekly',
  'before-restore': 'Before a restore',
  'before-reset': 'Before deleting all data',
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Zálohy v Settings: kopie mimo telefon (export) + automatické snapshoty
 * v telefonu s obnovou. Logika je v `core/backup.ts` a `lib/backups.ts`.
 */
export function BackupCard() {
  const { data, updateSettings, replaceAllData } = useAppState()
  const [status, setStatus] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotSummary[] | null>(null)
  const [open, setOpen] = useState(false)
  const offPhone = offPhoneBackupStatus(data, new Date())
  const ownSessions = data.sessions.filter((s) => !s.isSample).length

  const refresh = useCallback(() => {
    listSnapshots().then(setSnapshots, () => setSnapshots([]))
  }, [])
  // Po každém tréninku může přibýt snapshot — přenačíst, když se změní počet.
  useEffect(refresh, [refresh, data.sessions.length])

  async function handleExport() {
    try {
      setStatus(await exportBackup(data))
      updateSettings({ lastExportAt: new Date().toISOString() })
    } catch {
      setStatus('Could not save the backup.')
    }
  }

  async function restore(next: ReturnType<typeof deserialize>, from: string) {
    const yes = await confirm({
      title: 'Restore this backup?',
      message:
        `${from}: ${next.sessions.length} sessions, ${next.splits.length} splits. ` +
        `It replaces what's in the app now (${data.sessions.length} sessions) — ` +
        `the current data is saved as a backup first.`,
      confirmLabel: 'Restore',
      destructive: true,
    })
    if (!yes) return
    replaceAllData(next)
    setStatus('Backup restored.')
    // Pojistný snapshot se zapisuje asynchronně, chvíli počkat.
    setTimeout(refresh, 500)
  }

  async function handleImportFile() {
    let parsed: ReturnType<typeof deserialize>
    try {
      const content = await pickJson()
      if (content === null) return // zrušený výběr, není co hlásit
      parsed = deserialize(content)
      if (parsed.version !== DATA_VERSION && parsed.sessions.length === 0 && parsed.splits.length === 0) {
        throw new Error('invalid')
      }
    } catch {
      setStatus('Could not read that file. Check it is a backup export.')
      return
    }
    await restore(parsed, 'File')
  }

  async function handleRestoreSnapshot(s: SnapshotSummary) {
    try {
      await restore(await loadSnapshot(s.id), `${formatShort(s.createdAt)} ${timeOf(s.createdAt)}`)
    } catch {
      setStatus('Could not read that backup.')
    }
  }

  const latest = snapshots?.[0]

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Data & backup</Text>
      <Card className="gap-4">
        <Text className="text-xs text-muted">
          {plural(ownSessions, 'session')} · {plural(data.splits.length, 'split')} ·{' '}
          {plural(data.customExercises.length, 'custom exercise')}
        </Text>

        {/* Kopie mimo telefon — jediná ochrana před ztrátou telefonu. */}
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans-medium text-[15px] text-white">Copy off this phone</Text>
            <Text className="text-[13px] text-muted" style={tnum}>{daysAgoLabel(offPhone.daysAgo)}</Text>
          </View>
          {offPhone.stale ? (
            <Banner
              tone="warn"
              title={offPhone.daysAgo === null ? 'No copy outside this phone yet' : 'Your last copy is getting old'}
              description="If the phone is lost or reset, the automatic backups go with it."
            />
          ) : null}
          <Button
            title="Save backup to Files / iCloud"
            variant={offPhone.stale ? 'primary' : 'secondary'}
            onPress={handleExport}
          />
          <Text className="text-[12px] leading-[17px] text-faint">
            In the share sheet pick “Save to Files” → iCloud Drive.
          </Text>
        </View>

        {/* Automatické snapshoty v telefonu. */}
        <View className="gap-3 border-t border-line pt-4">
          <Pressable
            onPress={() => setOpen((o) => !o)}
            disabled={!snapshots?.length}
            className="min-h-[44px] flex-row items-center justify-between"
            accessibilityRole="button"
          >
            <View className="flex-1">
              <Text className="font-sans-medium text-[15px] text-white">Automatic backups</Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">
                {snapshots === null
                  ? 'Loading…'
                  : latest
                    ? `${snapshots.length} on this phone · latest ${formatShort(latest.createdAt)} ${timeOf(latest.createdAt)}`
                    : 'Made after every session and weekly.'}
              </Text>
            </View>
            {snapshots?.length ? (
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            ) : null}
          </Pressable>

          {open && snapshots?.length ? (
            <View className="gap-1">
              {snapshots.map((s, i) => (
                <View
                  key={s.id}
                  className={cn('min-h-[52px] flex-row items-center gap-3 py-1', i > 0 && 'border-t border-line')}
                >
                  <View className="flex-1">
                    <Text className="text-sm text-white" style={tnum}>
                      {formatShort(s.createdAt)} · {timeOf(s.createdAt)}
                    </Text>
                    <Text className="text-[12px] text-muted">
                      {REASON_LABEL[s.reason]} · {plural(s.sessions, 'session')}
                    </Text>
                  </View>
                  <Button title="Restore" variant="ghost" size="sm" onPress={() => handleRestoreSnapshot(s)} />
                </View>
              ))}
              <Text className="mt-1 text-[12px] leading-[17px] text-faint">Stored in {snapshotLocation}.</Text>
            </View>
          ) : null}
        </View>

        <View className="border-t border-line pt-4">
          <Button title="Restore from file" variant="secondary" onPress={handleImportFile} />
        </View>

        {status ? <Text className="text-xs text-muted">{status}</Text> : null}
      </Card>
    </View>
  )
}
