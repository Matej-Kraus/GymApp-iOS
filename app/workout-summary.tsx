import { useEffect } from 'react'
import { Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { sessionVolume, countScoringSets, epley1RM } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, cn } from '@/components/ui'
import { formatLongCZ } from '@/lib/format'
import { celebrate } from '@/lib/haptics'

function StatCard({ value, unit, label, accent, delay = 0 }: { value: string; unit?: string; label: string; accent?: boolean; delay?: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(16)}
      className="flex-1 rounded-2xl bg-card border border-white/[0.06] p-4 items-center"
    >
      <View className="flex-row items-baseline">
        <Text className={cn('font-display text-2xl', accent ? 'text-accent' : 'text-white')} style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
        {unit ? <Text className="ml-1 text-xs font-medium text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </Animated.View>
  )
}

export default function WorkoutSummary() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data } = useAppState()

  const found = data.sessions.find((s) => s.id === id)
  const hasPRforHook = !!found && found.entries.some((e) => e.sets.some((s) => s.isPR))

  // Oslava PR (haptika + jemný pulz). Hooky musí být před early-returnem.
  const pulse = useSharedValue(1)
  useEffect(() => {
    if (hasPRforHook) {
      celebrate()
      pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 700 }), withTiming(1, { duration: 700 })), -1, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPRforHook])
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

  if (!found) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-muted mb-3">Trénink nenalezen.</Text>
        <Button title="Domů" onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }
  const session = found // zúžený, ne-undefined typ (funguje i uvnitř closures)

  const volume = Math.round(sessionVolume(session))
  const sets = countScoringSets(session)
  const exerciseCount = session.entries.length
  const previousSession =
    data.sessions
      .filter((s) => s.splitId === session.splitId && s.id !== session.id && s.date < session.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const prevVolume = previousSession ? Math.round(sessionVolume(previousSession)) : null
  const volumeDelta = prevVolume !== null ? volume - prevVolume : null
  const prEntries = session.entries.filter((e) => e.sets.some((s) => s.isPR))
  const hasPR = prEntries.length > 0

  async function handleShare() {
    const lines = [
      `${session.splitName} — ${formatLongCZ(session.date)}`,
      `Objem: ${volume.toLocaleString('cs-CZ')} kg · ${sets} sérií · ${exerciseCount} cviků`,
      hasPR ? '🏆 Nový osobní rekord!' : '',
      '— Workout Tracker',
    ].filter(Boolean)
    await Share.share({ message: lines.join('\n') })
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} className="px-5 pt-8 pb-6 items-center gap-2">
        <Text className="text-5xl">{hasPR ? '🏆' : '💪'}</Text>
        <Text className="font-display text-2xl text-accent">Trénink dokončen!</Text>
        <Text className="text-sm text-muted text-center">
          {session.splitName} · {formatLongCZ(session.date)}
          {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
        </Text>
      </Animated.View>

      <View className="px-4 gap-4 flex-1">
        <View className="flex-row gap-3">
          <StatCard value={volume.toLocaleString('cs-CZ')} unit="kg" label="Objem" accent delay={60} />
          <StatCard value={String(sets)} label="Sérií" delay={120} />
        </View>
        <View className="flex-row gap-3">
          <StatCard value={String(exerciseCount)} label="Cviků" delay={180} />
          {volumeDelta !== null ? (
            <StatCard
              value={(volumeDelta >= 0 ? '+' : '') + volumeDelta.toLocaleString('cs-CZ')}
              unit="kg"
              label="vs. minule"
              accent={volumeDelta > 0}
              delay={240}
            />
          ) : (
            <StatCard value="—" label="vs. minule" delay={240} />
          )}
        </View>

        {hasPR && (
          <Animated.View
            entering={FadeInDown.delay(320).springify().damping(14)}
            style={pulseStyle}
            className="flex-row items-center gap-3 rounded-2xl bg-accent/10 border border-accent/30 px-4 py-3"
          >
            <Text className="text-2xl">🏆</Text>
            <View className="flex-1">
              <Text className="text-sm font-bold text-accent">Nový osobní rekord!</Text>
              <Text className="text-xs text-muted">
                {prEntries
                  .map((e) => {
                    const prSet = e.sets.find((s) => s.isPR)!
                    return `${e.exerciseName} — 1RM ≈ ${Math.round(epley1RM(prSet.weight, prSet.reps))} kg`
                  })
                  .join(' · ')}
              </Text>
            </View>
          </Animated.View>
        )}

        <View className="flex-row gap-3 mt-auto mb-2">
          <Button title="Hotovo" size="lg" className="flex-1" onPress={() => router.replace('/')} />
          <Button title="Sdílet" variant="secondary" size="lg" className="px-5" onPress={handleShare} />
        </View>
      </View>
    </SafeAreaView>
  )
}
