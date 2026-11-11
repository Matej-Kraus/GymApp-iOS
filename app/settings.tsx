import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { confirm } from '@/lib/platform'
import { formatShort, todayISO } from '@/lib/format'
import { useAppState } from '@/state/AppStateContext'
import { Button, Chip, GUTTER, IconButton, Rule, Screen, Segmented, Title } from '@/components/ui'
import { currentWeek, defaultMesocycle } from '@/core'
import type { ReminderConfig, Unit } from '@/core'
import { applyReminders } from '@/lib/reminders'
import { isHealthAvailable, requestHealthAccess } from '@/lib/health'
import { BackupSection } from '@/features/settings/BackupSection'
import { ToolsSection } from '@/features/settings/ToolsSection'
import { Group, Setting, ToggleRow } from '@/features/settings/parts'
import { localeTag, tr, type Lang } from '@/i18n'

const REMINDER_HOURS = [6, 7, 8, 9, 10, 12, 16, 17, 18, 19, 20, 21]
const PLATE_OPTIONS = [1.25, 2.5, 5]
const REST_OPTIONS = [60, 90, 120, 150, 180]
const MESO_LENGTHS = [4, 5, 6]
const BAR_OPTIONS = [20, 15, 10]

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Settings() {
  const { data, updateSettings, resetAllData, loadSampleData, deleteSampleData } = useAppState()
  const router = useRouter()
  const t = tr()
  const s = t.settings
  const { unit, smallestPlateKg } = data.settings
  const restSeconds = data.settings.restSeconds ?? 120
  const mesocycle = data.settings.mesocycle
  const barWeightKg = data.settings.barWeightKg ?? 20
  const [reminderStatus, setReminderStatus] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const hasSampleData = data.sessions.some((x) => x.isSample) || data.splits.some((x) => x.isSample)

  async function setHealthWrite(on: boolean) {
    if (!on) return updateSettings({ writeWorkoutsToHealth: false })
    // Zapnout jde jen když Health existuje a uživatel povolí přístup —
    // jinak by přepínač svítil a nic by se nezapisovalo.
    const ok = (await isHealthAvailable()) && (await requestHealthAccess())
    if (ok) updateSettings({ writeWorkoutsToHealth: true })
    setHealthStatus(ok ? null : s.healthDenied)
  }

  const reminder: ReminderConfig = data.settings.reminder ?? { enabled: false, hour: 18, days: [] }
  async function updateReminder(patch: Partial<ReminderConfig>) {
    const next = { ...reminder, ...patch }
    updateSettings({ reminder: next })
    // applyReminders vrátí false, když chybí povolení nebo platforma
    // notifikace neumí (web). Bez tohohle zůstal přepínač zapnutý a
    // uživatel si myslel, že mu připomínka běží.
    const ok = await applyReminders(next)
    if (!ok && next.enabled) updateSettings({ reminder: { ...next, enabled: false } })
    setReminderStatus(!ok && next.enabled ? s.remindDenied : null)
  }
  function toggleDay(d: number) {
    const days = reminder.days.includes(d)
      ? reminder.days.filter((v) => v !== d)
      : [...reminder.days, d].sort((a, b) => a - b)
    updateReminder({ days })
  }
  // 1. 1. 2024 bylo pondělí — zkratky dnů v jazyce appky.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(localeTag(), { weekday: 'short' }),
  )

  async function handleReset() {
    const yes = await confirm({
      title: s.resetTitle,
      message: s.resetText,
      confirmLabel: s.resetConfirm,
      destructive: true,
    })
    if (yes) resetAllData()
  }

  return (
    <Screen>
      <View className="flex-row items-center" style={{ paddingLeft: 6, height: 52 }}>
        <IconButton icon="chevron-back" label={t.common.back} onPress={() => router.back()} />
        <Title size="sm" className="ml-1 flex-1">
          {s.title}
        </Title>
      </View>
      <Rule />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="mt-6">
          <Setting label={s.language}>
            <Segmented<Lang | 'system'>
              options={[
                { value: 'system', label: s.langSystem },
                { value: 'cs', label: 'Čeština' },
                { value: 'en', label: 'English' },
              ]}
              value={data.settings.language ?? 'system'}
              onChange={(v) => updateSettings({ language: v === 'system' ? undefined : v })}
            />
          </Setting>
          <Setting label={s.units} hint={s.unitsHint}>
            <Segmented<Unit>
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
              value={unit}
              onChange={(v) => updateSettings({ unit: v })}
            />
          </Setting>
        </View>

        <Group title={s.training}>
          <Setting label={s.rest} hint={s.restHint}>
            <Segmented
              options={REST_OPTIONS.map((v) => ({ value: String(v), label: mmss(v) }))}
              value={String(restSeconds)}
              onChange={(v) => updateSettings({ restSeconds: Number(v) })}
            />
          </Setting>
          <Setting label={s.smallestPlate} hint={s.smallestPlateHint}>
            <Segmented
              options={PLATE_OPTIONS.map((p) => ({ value: String(p), label: `${String(p).replace('.', localeTag() === 'cs-CZ' ? ',' : '.')} kg` }))}
              value={String(smallestPlateKg)}
              onChange={(v) => updateSettings({ smallestPlateKg: Number(v) })}
            />
          </Setting>
          <Setting label={s.bar}>
            <Segmented
              options={BAR_OPTIONS.map((b) => ({ value: String(b), label: `${b} kg` }))}
              value={String(barWeightKg)}
              onChange={(v) => updateSettings({ barWeightKg: Number(v) })}
            />
          </Setting>
          <Setting label={s.warmup} hint={s.warmupHint}>
            <Segmented<'short' | 'standard' | 'thorough'>
              options={[
                { value: 'short', label: s.warmupShort },
                { value: 'standard', label: s.warmupStandard },
                { value: 'thorough', label: s.warmupThorough },
              ]}
              value={data.settings.warmupScheme ?? 'standard'}
              onChange={(v) => updateSettings({ warmupScheme: v })}
            />
          </Setting>
        </Group>

        <Group title={s.meso}>
          <ToggleRow
            label={s.mesoRun}
            hint={s.mesoHint}
            value={!!mesocycle}
            onChange={(on) => updateSettings({ mesocycle: on ? defaultMesocycle(todayISO()) : undefined })}
          />
          {mesocycle ? (
            <View className="mt-4">
              <Segmented
                options={MESO_LENGTHS.map((w) => ({ value: String(w), label: s.mesoWeeks(w) }))}
                value={String(mesocycle.lengthWeeks)}
                onChange={(v) => updateSettings({ mesocycle: { ...mesocycle, lengthWeeks: Number(v) } })}
              />
              <View className="mt-4">
                <ToggleRow
                  label={s.mesoDeload}
                  value={mesocycle.deloadWeek}
                  onChange={(on) => updateSettings({ mesocycle: { ...mesocycle, deloadWeek: on } })}
                />
              </View>
              <Text className="mt-3 text-[14px] text-muted">
                {s.mesoStatus(currentWeek(mesocycle), mesocycle.lengthWeeks, formatShort(mesocycle.startDate))}
              </Text>
              <Button
                className="mt-3"
                title={s.mesoRestart}
                variant="secondary"
                size="sm"
                onPress={() => updateSettings({ mesocycle: { ...mesocycle, startDate: todayISO() } })}
              />
            </View>
          ) : null}
        </Group>

        <Group title={s.reminders}>
          <ToggleRow
            label={s.remind}
            value={reminder.enabled}
            onChange={(on) => updateReminder({ enabled: on })}
          />
          {reminder.enabled ? (
            <View className="mt-4">
              <Text className="mb-1.5 text-[15px] text-white">{s.remindDays}</Text>
              <View className="flex-row" style={{ gap: 5 }}>
                {weekdays.map((label, i) => (
                  <Chip
                    key={label}
                    className="flex-1"
                    compact
                    label={label}
                    active={reminder.days.includes(i + 1)}
                    onPress={() => toggleDay(i + 1)}
                  />
                ))}
              </View>
              <Text className="mb-1.5 mt-4 text-[15px] text-white">{s.remindTime}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -GUTTER }}
                contentContainerStyle={{ gap: 6, paddingHorizontal: GUTTER }}
              >
                {REMINDER_HOURS.map((h) => (
                  <Chip key={h} label={`${h}:00`} active={reminder.hour === h} onPress={() => updateReminder({ hour: h })} />
                ))}
              </ScrollView>
            </View>
          ) : null}
          {reminderStatus ? <Text className="mt-3 text-[14px] text-warn">{reminderStatus}</Text> : null}
        </Group>

        <Group title={s.health}>
          <ToggleRow
            label={s.healthWrite}
            hint={s.healthHint}
            value={!!data.settings.writeWorkoutsToHealth}
            onChange={setHealthWrite}
          />
          {healthStatus ? <Text className="mt-3 text-[14px] text-warn">{healthStatus}</Text> : null}
        </Group>

        <Group title={t.tools.title}>
          <ToolsSection barWeightKg={barWeightKg} stepKg={smallestPlateKg * 2} />
        </Group>

        <Group title={t.backup.title}>
          <BackupSection />
        </Group>

        <Group title={s.sample}>
          <Text className="mb-3 text-[15px] leading-[21px] text-muted">{s.sampleHint}</Text>
          {!hasSampleData ? (
            <Button title={s.sampleLoad} variant="secondary" onPress={loadSampleData} />
          ) : (
            <Button
              title={s.sampleDelete}
              variant="danger"
              onPress={async () => {
                const yes = await confirm({
                  title: s.sampleDeleteTitle,
                  message: s.sampleDeleteText,
                  confirmLabel: t.common.delete,
                  destructive: true,
                })
                if (yes) deleteSampleData()
              }}
            />
          )}
        </Group>

        <View className="mt-10">
          <Rule />
          <Text className="py-4 text-[14px] leading-[20px] text-muted">{s.about}</Text>
          <Button title={s.reset} variant="danger" onPress={handleReset} />
        </View>
      </ScrollView>
    </Screen>
  )
}
