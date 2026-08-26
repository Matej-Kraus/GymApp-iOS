import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, PageHeader, cn } from '@/components/ui'
import { DATA_VERSION, deserialize } from '@/core'
import type { Unit, ReminderConfig } from '@/core'
import { applyReminders } from '@/lib/reminders'

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const REMINDER_HOURS = [6, 7, 8, 9, 10, 12, 16, 17, 18, 19, 20, 21]

const UNIT_OPTIONS: Unit[] = ['kg', 'lb']
const PLATE_OPTIONS = [1.25, 2.5, 5]
const REST_OPTIONS = [60, 90, 120, 150, 180]
const BAR_OPTIONS = [20, 15, 10]

function Segmented({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View className="flex-row gap-1 rounded-2xl bg-panel2 p-1">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={cn('h-10 flex-1 rounded-xl items-center justify-center', value === opt.value && 'bg-accent')}
        >
          <Text className={cn('text-sm font-semibold', value === opt.value ? 'text-black' : 'text-muted')}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export default function Settings() {
  const { data, updateSettings, resetAllData, replaceAllData, loadSampleData, deleteSampleData } = useAppState()
  const { unit, smallestPlateKg, activeProgramId } = data.settings
  const restSeconds = data.settings.restSeconds ?? 120
  const barWeightKg = data.settings.barWeightKg ?? 20
  const [status, setStatus] = useState<string | null>(null)
  const hasSampleData = data.sessions.some((s) => s.isSample) || data.splits.some((s) => s.isSample)

  const reminder: ReminderConfig = data.settings.reminder ?? { enabled: false, hour: 18, days: [] }
  function updateReminder(patch: Partial<ReminderConfig>) {
    const next = { ...reminder, ...patch }
    updateSettings({ reminder: next })
    applyReminders(next)
  }
  function toggleDay(d: number) {
    const days = reminder.days.includes(d)
      ? reminder.days.filter((x) => x !== d)
      : [...reminder.days, d].sort((a, b) => a - b)
    updateReminder({ days })
  }

  // Programy = skupiny splitů (groupId), které uživatel má.
  const programs = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of data.splits) if (s.groupId) map.set(s.groupId, s.groupName ?? s.groupId)
    return [...map.entries()]
  }, [data.splits])

  async function handleExport() {
    try {
      const path = FileSystem.cacheDirectory + `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2))
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Záloha tréninků' })
      } else {
        Alert.alert('Záloha uložena', path)
      }
    } catch {
      Alert.alert('Chyba', 'Export se nezdařil.')
    }
  }

  async function handleImport() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
      if (res.canceled || !res.assets?.[0]) return
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri)
      const parsed = deserialize(content)
      if (parsed.version !== DATA_VERSION && parsed.sessions.length === 0 && parsed.splits.length === 0) {
        throw new Error('invalid')
      }
      Alert.alert(
        'Obnovit ze zálohy?',
        `Přijdeš o ${data.sessions.length} tréninků a ${data.splits.length} splitů.`,
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Obnovit', style: 'destructive', onPress: () => { replaceAllData(parsed); setStatus('Záloha obnovena.') } },
        ],
      )
    } catch {
      setStatus('Nepodařilo se načíst soubor — zkontroluj formát.')
    }
  }

  function handleReset() {
    Alert.alert('Smazat VŠECHNA data?', 'Tohle nejde vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat vše', style: 'destructive', onPress: resetAllData },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-8">
        <View className="mt-2"><PageHeader title="Nastavení" /></View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Můj program</Text>
          <Card className="gap-2">
            {programs.length === 0 ? (
              <Text className="text-xs text-muted">
                Zatím nemáš žádný program. Přidej si šablonu (PPL, Upper/Lower…) v záložce Tréninky a pak ji tu nastav jako aktivní.
              </Text>
            ) : (
              <>
                <Text className="text-xs text-muted">
                  Aktivní program řídí doporučení dalšího tréninku (🎯 Dnes) a výběr při spuštění.
                </Text>
                {programs.map(([id, name]) => {
                  const active = activeProgramId === id
                  return (
                    <Pressable
                      key={id}
                      onPress={() => updateSettings({ activeProgramId: active ? undefined : id })}
                      className={cn('flex-row items-center justify-between rounded-xl px-3 py-3', active ? 'bg-accent/15 border border-accent/40' : 'bg-panel2')}
                    >
                      <Text className={cn('text-sm font-semibold', active ? 'text-accent' : 'text-white')}>{name}</Text>
                      <Text className={cn('text-base', active ? 'text-accent' : 'text-muted/40')}>{active ? '📍' : '○'}</Text>
                    </Pressable>
                  )
                })}
              </>
            )}
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Jednotky</Text>
          <Card>
            <Segmented
              options={UNIT_OPTIONS.map((u) => ({ value: u, label: u.toUpperCase() }))}
              value={unit}
              onChange={(v) => updateSettings({ unit: v as Unit })}
            />
            <Text className="mt-2 text-xs text-muted">Interně počítáme vždy v kg, lb je jen zobrazení.</Text>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Nejmenší kotouč</Text>
          <Card>
            <Segmented
              options={PLATE_OPTIONS.map((p) => ({ value: String(p), label: `${p} kg` }))}
              value={String(smallestPlateKg)}
              onChange={(v) => updateSettings({ smallestPlateKg: Number(v) })}
            />
            <Text className="mt-2 text-xs text-muted">Na násobky zaokrouhlujeme návrhy váhy při progresivním přetížení.</Text>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Odpočinek mezi sériemi</Text>
          <Card>
            <Segmented
              options={REST_OPTIONS.map((s) => ({ value: String(s), label: s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }))}
              value={String(restSeconds)}
              onChange={(v) => updateSettings({ restSeconds: Number(v) })}
            />
            <Text className="mt-2 text-xs text-muted">Po dokončení pracovní/back-off série naskočí odpočet s touto délkou.</Text>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Hmotnost osy</Text>
          <Card>
            <Segmented
              options={BAR_OPTIONS.map((b) => ({ value: String(b), label: `${b} kg` }))}
              value={String(barWeightKg)}
              onChange={(v) => updateSettings({ barWeightKg: Number(v) })}
            />
            <Text className="mt-2 text-xs text-muted">Výchozí hmotnost osy pro kalkulačku kotoučů v tréninku.</Text>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Připomínky tréninku</Text>
          <Card className="gap-3">
            <Pressable onPress={() => updateReminder({ enabled: !reminder.enabled })} className="flex-row items-center justify-between">
              <Text className="text-sm text-white">Připomínat trénink</Text>
              <View className={cn('h-6 w-11 rounded-full justify-center', reminder.enabled ? 'bg-accent' : 'bg-panel2')}>
                <View className={cn('h-5 w-5 rounded-full bg-white', reminder.enabled ? 'ml-5' : 'ml-0.5')} />
              </View>
            </Pressable>
            {reminder.enabled && (
              <>
                <View>
                  <Text className="text-xs text-muted mb-1">Dny</Text>
                  <View className="flex-row gap-1.5">
                    {WEEKDAYS.map((lbl, i) => {
                      const d = i + 1
                      const on = reminder.days.includes(d)
                      return (
                        <Pressable key={d} onPress={() => toggleDay(d)} className={cn('flex-1 rounded-lg py-2 items-center', on ? 'bg-accent' : 'bg-panel2')}>
                          <Text className={cn('text-xs font-semibold', on ? 'text-black' : 'text-muted')}>{lbl}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
                <View>
                  <Text className="text-xs text-muted mb-1">Čas: {String(reminder.hour).padStart(2, '0')}:00</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                    {REMINDER_HOURS.map((h) => (
                      <Pressable key={h} onPress={() => updateReminder({ hour: h })} className={cn('rounded-full px-3 py-1.5', reminder.hour === h ? 'bg-accent' : 'bg-panel2')}>
                        <Text className={cn('text-xs font-semibold', reminder.hour === h ? 'text-black' : 'text-muted')}>{h}:00</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text className="text-xs text-muted">Pozn.: notifikace fungují až ve finálním buildu na iPhonu (ne v Expo Go).</Text>
              </>
            )}
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Data & záloha</Text>
          <Card className="gap-3">
            <Text className="text-xs text-muted">
              {data.sessions.length} tréninků · {data.splits.length} splitů · {data.customExercises.length} vlastních cviků
            </Text>
            <Button title="Exportovat zálohu (JSON)" variant="secondary" onPress={handleExport} />
            <Button title="Importovat ze zálohy" variant="secondary" onPress={handleImport} />
            {status ? <Text className="text-xs text-accent">{status}</Text> : null}
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Ukázková data</Text>
          <Card className="gap-3">
            <Text className="text-xs text-muted">
              Načti 2 ukázkové tréninky (Push + Pull) s vyplněnými sériemi — pro rychlé otestování.
            </Text>
            {!hasSampleData ? (
              <Button title="Načíst ukázková data" variant="secondary" size="sm" onPress={loadSampleData} />
            ) : (
              <Button
                title="Smazat ukázková data"
                variant="danger"
                size="sm"
                onPress={() =>
                  Alert.alert('Smazat ukázková data?', 'Vlastní tréninky zůstanou.', [
                    { text: 'Zrušit', style: 'cancel' },
                    { text: 'Smazat', style: 'destructive', onPress: deleteSampleData },
                  ])
                }
              />
            )}
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">O aplikaci</Text>
          <Card>
            <Text className="text-xs text-muted">Workout Tracker · 100 % offline · data v telefonu · žádné účty, žádné reklamy.</Text>
            <Text className="mt-1 text-xs text-muted">Verze dat: {data.version}</Text>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-danger">Nebezpečná zóna</Text>
          <Button title="Smazat všechna data" variant="danger" onPress={handleReset} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
