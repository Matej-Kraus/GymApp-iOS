import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Button, Field, Num, SectionTitle } from '@/components/ui'
import { AreaChart } from '@/components/charts/AreaChart'
import { useAppState } from '@/state/AppStateContext'
import { fmtNum, todayISO } from '@/lib/format'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'
import { axisDate } from './ExerciseTrend'

const MEASURES = ['waist', 'chest', 'arms', 'thighs'] as const
type MeasureKey = (typeof MEASURES)[number]
const num = (v: string) => parseFloat(v.replace(',', '.'))

/** Tělesná váha a míry: dnešní zápis a vývoj. */
export function BodySection() {
  const { data, logBodyWeight, deleteBodyWeightEntry, logMeasurement } = useAppState()
  const t = tr()
  const p = t.progress
  const today = todayISO()

  const todayEntry = data.bodyWeightLog.find((e) => e.date === today)
  const sortedWeights = useMemo(
    () => [...data.bodyWeightLog].sort((a, b) => a.date.localeCompare(b.date)),
    [data.bodyWeightLog],
  )
  const last = sortedWeights[sortedWeights.length - 1] ?? null
  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  // Graf vážení je stav, ne postup — křídová čára, ne oranžová.
  const weightChart = useMemo(
    () => sortedWeights.map((e) => ({ value: e.kg, label: axisDate(`${e.date}T12:00:00`) })),
    [sortedWeights],
  )

  function saveWeight() {
    const kg = num(weightInput)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    logBodyWeight({ date: today, kg })
  }

  const todayMeasure = data.measurements.find((m) => m.date === today)
  const [inputs, setInputs] = useState<Record<MeasureKey, string>>(() => ({
    waist: todayMeasure?.waist ? String(todayMeasure.waist) : '',
    chest: todayMeasure?.chest ? String(todayMeasure.chest) : '',
    arms: todayMeasure?.arms ? String(todayMeasure.arms) : '',
    thighs: todayMeasure?.thighs ? String(todayMeasure.thighs) : '',
  }))
  function saveMeasures() {
    const entry: { date: string } & Partial<Record<MeasureKey, number>> = { date: today }
    let any = false
    for (const key of MEASURES) {
      const v = num(inputs[key])
      if (!isNaN(v) && v > 0) {
        entry[key] = v
        any = true
      }
    }
    if (any) logMeasurement(entry)
  }
  function series(key: MeasureKey) {
    return [...data.measurements]
      .filter((m) => typeof m[key] === 'number')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ value: m[key] as number, label: axisDate(`${m.date}T12:00:00`) }))
  }

  return (
    <View>
      <SectionTitle>{p.body}</SectionTitle>
      <View className="flex-row items-end" style={{ gap: 8 }}>
        <Field
          className="flex-1"
          label={p.weightToday}
          keyboardType="decimal-pad"
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder={last ? fmtNum(last.kg, 1) : ''}
        />
        <Button title={todayEntry ? p.update : t.common.save} variant="secondary" size="md" disabled={!weightInput} onPress={saveWeight} />
      </View>
      {last && last.date !== today ? (
        <Text className="mt-1.5 text-[14px] text-muted">{p.weightLast(fmtNum(last.kg, 1))}</Text>
      ) : null}

      {sortedWeights.length >= 2 ? (
        <View className="mt-6">
          <View className="mb-1 flex-row items-baseline justify-between">
            <Text className="text-[15px] text-muted">{p.weightChart}</Text>
            <Num className="text-[24px]">
              {fmtNum(last!.kg, 1)} {t.common.kg}
            </Num>
          </View>
          <AreaChart data={weightChart} unit={t.common.kg} height={170} color={colors.text} />
          <Pressable
            onPress={() => deleteBodyWeightEntry(last!.date)}
            accessibilityRole="button"
            className="h-11 justify-center self-start active:opacity-60"
          >
            <Text className="text-[14px] text-muted underline">{p.deleteLatest}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text className="mb-2 mt-6 text-[15px] font-semibold text-white">{p.measures}</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {MEASURES.map((key) => (
          <Field
            key={key}
            className="flex-1"
            label={p.measure[key]}
            keyboardType="decimal-pad"
            value={inputs[key]}
            onChangeText={(v) => setInputs((prev) => ({ ...prev, [key]: v }))}
          />
        ))}
      </View>
      <Button
        className="mt-3"
        title={todayMeasure ? p.measuresUpdate : p.measuresSave}
        variant="secondary"
        size="sm"
        onPress={saveMeasures}
      />

      {MEASURES.map((key) => {
        const s = series(key)
        if (s.length < 2) return null
        return (
          <View key={key} className="mt-6">
            <View className="mb-1 flex-row items-baseline justify-between">
              <Text className="text-[15px] text-muted">{p.measure[key]}</Text>
              <Num className="text-[24px]">
                {fmtNum(s[s.length - 1].value, 1)} {p.cm}
              </Num>
            </View>
            <AreaChart data={s} unit={p.cm} height={150} color={colors.text} />
          </View>
        )
      })}
    </View>
  )
}
