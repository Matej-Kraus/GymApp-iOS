import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Banner, Button, Row, Rule, tnum } from '@/components/ui'
import { DATA_VERSION, deserialize, offPhoneBackupStatus } from '@/core'
import { confirm, pickJson } from '@/lib/platform'
import { exportBackup, listSnapshots, loadSnapshot, snapshotLocation, type SnapshotSummary } from '@/lib/backups'
import { formatShort } from '@/lib/format'
import { useAppState } from '@/state/AppStateContext'
import { colors } from '@/theme/colors'
import { localeTag, tr } from '@/i18n'

function when(iso: string): string {
  const time = new Date(iso).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' })
  return `${formatShort(iso)} ${time}`
}

/**
 * Zálohy: kopie mimo telefon (export) a automatické snapshoty v telefonu
 * s obnovou. Logika je v `core/backup.ts` a `lib/backups.ts`.
 */
export function BackupSection() {
  const { data, updateSettings, replaceAllData } = useAppState()
  const t = tr()
  const b = t.backup
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
      await exportBackup(data)
      updateSettings({ lastExportAt: new Date().toISOString() })
      setStatus(b.exported)
    } catch {
      setStatus(b.exportFailed)
    }
  }

  async function restore(next: ReturnType<typeof deserialize>, from: string) {
    const yes = await confirm({
      title: b.restoreTitle,
      message: b.restoreText(from, next.sessions.length, data.sessions.length),
      confirmLabel: b.restore,
      destructive: true,
    })
    if (!yes) return
    replaceAllData(next)
    setStatus(b.restored)
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
      setStatus(b.badFile)
      return
    }
    await restore(parsed, b.fromFile)
  }

  async function handleRestoreSnapshot(s: SnapshotSummary) {
    try {
      await restore(await loadSnapshot(s.id), when(s.createdAt))
    } catch {
      setStatus(b.badSnapshot)
    }
  }

  const latest = snapshots?.[0]

  return (
    <View>
      <Text className="mb-4 text-[14px] text-muted" style={tnum}>
        {b.summary(t.history.sessions(ownSessions), data.splits.length, data.customExercises.length)}
      </Text>

      {/* Kopie mimo telefon — jediná ochrana před ztrátou telefonu. */}
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-[15px] text-white">{b.offPhone}</Text>
        <Text className="text-[14px] text-muted" style={tnum}>
          {offPhone.daysAgo === null ? b.never : t.count.daysAgo(offPhone.daysAgo)}
        </Text>
      </View>
      {offPhone.stale ? (
        <View className="mb-3">
          <Banner
            tone="warn"
            title={offPhone.daysAgo === null ? b.noneTitle : b.staleTitle}
            description={b.staleText}
          />
        </View>
      ) : null}
      <Button title={b.export} variant={offPhone.stale ? 'primary' : 'secondary'} onPress={handleExport} />
      <Text className="mt-1.5 text-[13px] leading-[18px] text-faint">{b.exportHint}</Text>

      {/* Automatické snapshoty v telefonu. */}
      <View className="mt-6">
        <Rule />
        <Row onPress={snapshots?.length ? () => setOpen((o) => !o) : undefined}>
          <View className="flex-1">
            <Text className="text-[16px] text-white">{b.auto}</Text>
            <Text className="mt-0.5 text-[13px] leading-[18px] text-faint" style={tnum}>
              {snapshots === null
                ? b.loading
                : latest
                  ? b.autoSome(snapshots.length, when(latest.createdAt))
                  : b.autoNone}
            </Text>
          </View>
          {snapshots?.length ? (
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
          ) : null}
        </Row>
        <Rule />
        {open && snapshots?.length ? (
          <View>
            {snapshots.map((s) => (
              <View key={s.id}>
                <View className="min-h-[56px] flex-row items-center" style={{ gap: 12 }}>
                  <View className="flex-1 py-2">
                    <Text className="text-[15px] text-white" style={tnum}>
                      {when(s.createdAt)}
                    </Text>
                    <Text className="mt-0.5 text-[13px] text-muted">
                      {b.reason[s.reason]}, {t.history.sessions(s.sessions)}
                    </Text>
                  </View>
                  <Button title={b.restore} variant="ghost" size="sm" onPress={() => handleRestoreSnapshot(s)} />
                </View>
                <Rule />
              </View>
            ))}
            <Text className="mt-2 text-[13px] leading-[18px] text-faint">{b.storedIn(snapshotLocation)}</Text>
          </View>
        ) : null}
      </View>

      <Button className="mt-5" title={b.restoreFile} variant="secondary" onPress={handleImportFile} />
      {status ? <Text className="mt-3 text-[14px] text-muted">{status}</Text> : null}
    </View>
  )
}
