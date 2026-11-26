import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'
import { Button, Num, Rule, SectionTitle, tnum } from '@/components/ui'
import {
  isHealthAvailable,
  readBodyMetrics,
  readRecentWorkouts,
  readWeightHistory,
  requestHealthAccess,
  type BodyMetrics,
  type HealthWorkout,
} from '@/lib/health'
import { useAppState } from '@/state/AppStateContext'
import { fmtNum, formatShort, todayISO } from '@/lib/format'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

/** Apple Health: váha, složení těla a tréninky z hodinek. Jen čtení. */
export function HealthSection() {
  const { data, logBodyWeight } = useAppState()
  const h = tr().health
  const [available, setAvailable] = useState<boolean | null>(null)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<BodyMetrics | null>(null)
  const [weights, setWeights] = useState<{ date: string; kg: number }[]>([])
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([])

  useEffect(() => {
    let mounted = true
    isHealthAvailable().then((ok) => {
      if (!mounted) return
      setAvailable(ok)
      if (!ok) setNotice(Platform.OS === 'ios' ? h.notInBuild : h.iphoneOnly)
    })
    return () => {
      mounted = false
    }
  }, [h])

  async function load() {
    const [m, w, wk] = await Promise.all([readBodyMetrics(), readWeightHistory(), readRecentWorkouts(20)])
    setMetrics(m)
    setWeights(w)
    setWorkouts(wk)
    const any = m.weightKg != null || m.bodyFatPct != null || m.leanMassKg != null || w.length > 0 || wk.length > 0
    setNotice(any ? h.loaded : h.empty)
  }

  async function run(connect: boolean) {
    if (available !== true || busy) return
    setBusy(true)
    setNotice(null)
    try {
      if (connect) {
        const ok = await requestHealthAccess()
        setConnected(ok)
        if (!ok) return setNotice(h.noAccess)
      }
      await load()
    } catch {
      setNotice(h.loadFailed)
    } finally {
      setBusy(false)
    }
  }

  function importWeights() {
    const today = todayISO()
    const importable =
      weights.length > 0 ? weights : metrics?.weightKg != null ? [{ date: today, kg: metrics.weightKg }] : []
    if (importable.length === 0) return setNotice(h.noWeights)
    const existing = new Map(data.bodyWeightLog.map((e) => [e.date, e.kg]))
    let changed = 0
    for (const entry of importable) {
      if (existing.get(entry.date) !== entry.kg) changed += 1
      logBodyWeight(entry)
    }
    setNotice(changed > 0 ? h.imported(changed) : h.upToDate)
  }

  const total = useMemo(() => workouts.reduce((sum, w) => sum + w.durationMin, 0), [workouts])
  const dur = (min: number) => h.duration(Math.floor(min / 60), min % 60)
  const canImport = weights.length > 0 || metrics?.weightKg != null
  const val = (v: number | null | undefined) => (typeof v === 'number' ? fmtNum(v, 1) : '–')

  return (
    <View>
      <SectionTitle action={busy ? <ActivityIndicator color={colors.muted} /> : undefined}>{h.title}</SectionTitle>
      <Text className="mb-3 text-[14px] text-muted">
        {available === null ? h.checking : !available ? h.unavailable : connected ? h.connected : h.ready}
      </Text>

      {connected ? (
        <View>
          <View className="mb-4 flex-row">
            <Metric value={val(metrics?.weightKg)} unit="kg" label={h.weight} />
            <Metric value={val(metrics?.bodyFatPct)} unit="%" label={h.fat} />
            <Metric value={val(metrics?.leanMassKg)} unit="kg" label={h.lean} />
          </View>
          <Text className="text-[15px] text-white">{h.watch}</Text>
          <Text className="mb-2 mt-0.5 text-[14px] text-muted" style={tnum}>
            {workouts.length > 0 ? h.watchSummary(workouts.length, dur(total)) : h.watchNone}
          </Text>
          {workouts.slice(0, 5).map((w, i) => (
            <View key={`${w.date}-${i}`}>
              <Rule />
              <View className="flex-row items-center py-2.5" style={{ gap: 12 }}>
                <Text className="w-24 text-[14px] text-muted">{formatShort(`${w.date}T12:00:00`)}</Text>
                <Text className="flex-1 text-[15px] text-white" numberOfLines={1}>
                  {h.activity[w.activityType] ?? h.activityOther}
                </Text>
                <Text className="text-[14px] text-muted" style={tnum}>
                  {dur(w.durationMin)}
                  {w.energyKcal != null ? `, ${w.energyKcal} kcal` : ''}
                </Text>
              </View>
            </View>
          ))}
          {workouts.length > 0 ? <Rule /> : null}
        </View>
      ) : null}

      <View className="mt-3 flex-row" style={{ gap: 8 }}>
        <Button
          className="flex-1"
          title={connected ? h.reload : h.connect}
          variant="secondary"
          size="sm"
          disabled={available !== true || busy}
          onPress={() => run(!connected)}
        />
        {connected ? (
          <Button
            className="flex-1"
            title={h.importWeight}
            variant="secondary"
            size="sm"
            disabled={!canImport || busy}
            onPress={importWeights}
          />
        ) : null}
      </View>
      {notice ? <Text className="mt-3 text-[14px] leading-[19px] text-muted">{notice}</Text> : null}
    </View>
  )
}

function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View className="flex-1">
      <View className="flex-row items-baseline">
        <Num className="text-[28px] leading-[30px]">{value}</Num>
        {value !== '–' ? <Text className="ml-1 text-[14px] text-muted">{unit}</Text> : null}
      </View>
      <Text className="text-[13px] text-muted">{label}</Text>
    </View>
  )
}
