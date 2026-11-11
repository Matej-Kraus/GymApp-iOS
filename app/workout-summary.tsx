import { useEffect } from 'react'
import { ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { countScoringSets, epley1RM, sessionVolume } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, GUTTER, Num, Rule, Title, tnum } from '@/components/ui'
import { entryName } from '@/lib/exerciseName'
import { fmtNum, fmtSet, formatLong } from '@/lib/format'
import { celebrate } from '@/lib/haptics'
import { tr } from '@/i18n'

/** Souhrn po dokončení: co se zapsalo, jak proti minule a nové rekordy. */
export default function WorkoutSummary() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data } = useAppState()
  const insets = useSafeAreaInsets()
  const t = tr()
  const s = t.summary

  const session = data.sessions.find((x) => x.id === id)
  const hasPR = !!session && session.entries.some((e) => e.sets.some((x) => x.isPR))

  // Rekord oznámí haptika, ne animace. Hook musí být před early-returnem.
  useEffect(() => {
    if (hasPR) celebrate()
  }, [hasPR])

  if (!session) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-4 text-[16px] text-muted">{s.notFound}</Text>
        <Button title={t.common.done} onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }

  const volume = Math.round(sessionVolume(session))
  const sets = countScoringSets(session)
  const exerciseCount = session.entries.length
  const previous =
    data.sessions
      .filter((x) => x.splitId === session.splitId && x.id !== session.id && x.date < session.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const delta = previous && session.splitId ? volume - Math.round(sessionVolume(previous)) : null
  const records = session.entries.flatMap((e) =>
    e.sets.filter((x) => x.isPR).map((set) => ({ name: entryName(e), set })),
  )
  const name = session.splitName || t.workout.freeName

  async function handleShare() {
    const lines = [
      `${name}, ${formatLong(session!.date)}`,
      s.shareStats(fmtNum(volume, 0), sets, exerciseCount),
      hasPR ? s.shareRecord : '',
    ].filter(Boolean)
    await Share.share({ message: lines.join('\n') })
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 40, paddingBottom: 24 }}>
        <Title>{s.title}</Title>
        <Text className="mt-2 text-[16px] leading-[23px] text-muted">
          {name}, {formatLong(session.date)}
          {session.durationMinutes ? `, ${t.history.minutes(session.durationMinutes)}` : ''}
        </Text>

        <View className="mt-8 flex-row">
          <Stat grow={1.5} value={fmtNum(volume, 0)} unit={t.common.kg} label={t.today.statVolume} />
          <Stat value={String(sets)} label={s.sets} />
          <Stat value={String(exerciseCount)} label={s.exercises} />
        </View>
        {delta !== null ? (
          <Text className={delta > 0 ? 'mt-4 text-[15px] text-accent' : 'mt-4 text-[15px] text-muted'} style={tnum}>
            {s.vsLast(`${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNum(Math.abs(delta), 0)}`)}
          </Text>
        ) : null}

        {records.length > 0 ? (
          <View className="mt-10">
            <Text className="mb-2 text-[15px] font-semibold text-accent">{s.records}</Text>
            <Rule />
            {records.map((r, i) => (
              <View key={i}>
                <View className="min-h-[56px] flex-row items-center py-2" style={{ gap: 12 }}>
                  <Text className="flex-1 text-[16px] font-medium text-white" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <View className="items-end">
                    <Num className="text-[22px] leading-[24px]">{fmtSet(r.set.weight, r.set.reps)}</Num>
                    <Text className="mt-0.5 text-[14px] text-muted" style={tnum}>
                      {t.progress.e1rm(fmtNum(epley1RM(r.set.weight, r.set.reps), 0))}
                    </Text>
                  </View>
                </View>
                <Rule />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View
        className="flex-row border-t border-line"
        style={{ gap: 8, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button title={t.common.done} className="flex-1" onPress={() => router.replace('/')} />
        <Button title={s.share} variant="secondary" onPress={handleShare} />
      </View>
    </SafeAreaView>
  )
}

function Stat({ value, unit, label, grow = 1 }: { value: string; unit?: string; label: string; grow?: number }) {
  return (
    <View style={{ flex: grow }}>
      <View className="flex-row items-baseline">
        <Num className="text-[36px] leading-[38px]">{value}</Num>
        {unit ? <Text className="ml-1 text-[15px] text-muted">{unit}</Text> : null}
      </View>
      <Text className="text-[14px] text-muted">{label}</Text>
    </View>
  )
}
