import { useEffect } from 'react'
import { Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { sessionVolume, countScoringSets, epley1RM, findExercise, countsTowardProgress, formatWeight, formatVolume, kgToLb } from '@/core'
import type { Unit } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, cn } from '@/components/ui'
import { formatLongCZ } from '@/lib/format'

const MUSCLE_CZ: Record<string, string> = {
  Chest: 'Hrudník', Back: 'Záda', Legs: 'Nohy',
  Shoulders: 'Ramena', Arms: 'Paže', Core: 'Core',
}

function getMotivation(hasPR: boolean, volumeDelta: number | null, completionPct: number, unit: Unit): { text: string; emoji: string } {
  if (hasPR) return { emoji: '🔥', text: 'Nový rekord! Šlapeš jako stroj.' }
  if (volumeDelta !== null && volumeDelta > 100) return { emoji: '📈', text: `+${formatVolume(volumeDelta, unit)} objem vs minule. Progres!` }
  if (completionPct === 100) return { emoji: '✅', text: 'Perfektní provedení — všechny série dokončeny!' }
  if (completionPct >= 85) return { emoji: '💪', text: 'Skvělý trénink! Skoro dokonalý.' }
  return { emoji: '🎯', text: 'Odtrénováno. Odpočinek je taky součást hry.' }
}

export default function WorkoutSummary() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data } = useAppState()
  const unit = data.settings.unit

  const found = data.sessions.find((s) => s.id === id)

  useEffect(() => {
    if (found?.entries.some((e) => e.sets.some((s) => s.isPR))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [])

  if (!found) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-muted mb-3">Trénink nenalezen.</Text>
        <Button title="Domů" onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }
  const session = found

  const volume = Math.round(sessionVolume(session))
  const sets = countScoringSets(session)
  const exerciseCount = session.entries.length
  const totalSets = session.entries.reduce((n, e) => n + e.sets.length, 0)
  const completedSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const completionPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  const previousSession = data.sessions
    .filter((s) => s.splitId === session.splitId && s.id !== session.id && s.date < session.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const prevVolume = previousSession ? Math.round(sessionVolume(previousSession)) : null
  const volumeDelta = prevVolume !== null ? volume - prevVolume : null

  const prEntries = session.entries.filter((e) => e.sets.some((s) => s.isPR))
  const hasPR = prEntries.length > 0

  // Svalové skupiny
  const muscleGroups = [...new Set(
    session.entries
      .map((e) => findExercise(e.exerciseId, data.customExercises)?.muscleGroup)
      .filter((g) => !!g)
  )] as string[]

  // Nejlepší série na každý cvik (nejvyšší váha, jen working/backoff)
  const bestSets = session.entries
    .map((entry) => {
      const scoring = entry.sets.filter(countsTowardProgress)
      if (!scoring.length) return null
      const best = scoring.reduce((b, s) => (s.weight > b.weight ? s : b))
      return { name: entry.exerciseName, reps: best.reps, weight: best.weight, isPR: best.isPR }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const motivation = getMotivation(hasPR, volumeDelta, completionPct, unit)

  async function handleShare() {
    const prLine = hasPR ? `🏆 ${prEntries.map((e) => e.exerciseName).join(', ')} — nový rekord!\n` : ''
    const lines = [
      `💪 ${session.splitName} — ${formatLongCZ(session.date)}`,
      `Objem: ${formatVolume(volume, unit)} · ${sets} sérií · ${exerciseCount} cviků`,
      session.durationMinutes ? `⏱ ${session.durationMinutes} min` : '',
      prLine,
      '— Workout Tracker',
    ].filter(Boolean)
    await Share.share({ message: lines.join('\n') })
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6">

        {/* Hlavička */}
        <View className="pt-8 pb-5 items-center gap-2">
          <Text className="text-5xl">{motivation.emoji}</Text>
          <Text className="font-display text-2xl font-bold text-accent text-center">Trénink dokončen!</Text>
          <Text className="text-sm text-muted text-center">
            {session.splitName} · {formatLongCZ(session.date)}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
          </Text>
          <View className="mt-1 rounded-2xl bg-card border border-white/10 px-4 py-2">
            <Text className="text-xs text-white text-center">{motivation.text}</Text>
          </View>
        </View>

        {/* Hlavní statistiky */}
        <View className="gap-2 mb-4">
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-2xl bg-card border border-accent/30 p-4 items-center">
              <View className="flex-row items-baseline">
                <Text className="font-display text-2xl font-bold text-accent">{Math.round(unit === 'lb' ? kgToLb(volume) : volume).toLocaleString('cs-CZ')}</Text>
                <Text className="ml-1 text-xs text-muted">{unit}</Text>
              </View>
              <Text className="mt-1 text-xs text-muted">Objem</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-card border border-white/10 p-4 items-center">
              <Text className="font-display text-2xl font-bold text-white">{sets}</Text>
              <Text className="mt-1 text-xs text-muted">Sérií</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-2xl bg-card border border-white/10 p-4 items-center">
              <Text className="font-display text-2xl font-bold text-white">{exerciseCount}</Text>
              <Text className="mt-1 text-xs text-muted">Cviků</Text>
            </View>
            <View className={cn('flex-1 rounded-2xl bg-card border p-4 items-center',
              volumeDelta !== null && volumeDelta > 0 ? 'border-accent/30' : 'border-white/10')}>
              <View className="flex-row items-baseline">
                <Text className={cn('font-display text-2xl font-bold',
                  volumeDelta !== null && volumeDelta > 0 ? 'text-accent' : 'text-white')}>
                  {volumeDelta !== null ? (volumeDelta >= 0 ? '+' : '') + Math.round(unit === 'lb' ? kgToLb(volumeDelta) : volumeDelta).toLocaleString('cs-CZ') : '—'}
                </Text>
                {volumeDelta !== null && <Text className="ml-1 text-xs text-muted">{unit}</Text>}
              </View>
              <Text className="mt-1 text-xs text-muted">vs. minule</Text>
            </View>
          </View>
        </View>

        {/* Dokončení sérií */}
        <View className="rounded-2xl bg-card border border-white/10 px-4 py-3 mb-4 gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-white">Dokončení</Text>
            <Text className="text-xs font-bold text-accent">{completedSets}/{totalSets} sérií · {completionPct} %</Text>
          </View>
          <View className="h-2 rounded-full bg-card2 overflow-hidden">
            <View
              className={cn('h-full rounded-full', completionPct === 100 ? 'bg-accent' : 'bg-accent/60')}
              style={{ width: `${completionPct}%` }}
            />
          </View>
        </View>

        {/* Svalové skupiny */}
        {muscleGroups.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            {muscleGroups.map((g) => (
              <View key={g} className="rounded-full bg-accent/15 border border-accent/30 px-3 py-1">
                <Text className="text-xs font-semibold text-accent">{MUSCLE_CZ[g as keyof typeof MUSCLE_CZ] ?? g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* PR badge */}
        {hasPR && (
          <View className="flex-row items-center gap-3 rounded-2xl bg-accent/10 border border-accent/30 px-4 py-3 mb-4">
            <Text className="text-2xl">🏆</Text>
            <View className="flex-1">
              <Text className="text-sm font-bold text-accent">Nový osobní rekord!</Text>
              <Text className="text-xs text-muted">
                {prEntries.map((e) => {
                  const prSet = e.sets.find((s) => s.isPR)!
                  return `${e.exerciseName} — 1RM ≈ ${formatWeight(epley1RM(prSet.weight, prSet.reps), unit)}`
                }).join(' · ')}
              </Text>
            </View>
          </View>
        )}

        {/* Nejlepší série */}
        {bestSets.length > 0 && (
          <View className="gap-1.5 mb-6">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Nejlepší série</Text>
            {bestSets.map((s, i) => (
              <View key={i} className="flex-row items-center justify-between rounded-xl bg-card border border-white/10 px-3 py-2">
                <Text className="text-sm text-white flex-1" numberOfLines={1}>{s.name}</Text>
                <View className="flex-row items-center gap-2">
                  {s.isPR && (
                    <View className="rounded-full bg-accent/20 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-accent">PR</Text>
                    </View>
                  )}
                  <Text className="font-display font-bold text-white">{s.reps}×{formatWeight(s.weight, unit)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Tlačítka */}
      <View className="px-5 pb-2 pt-3 border-t border-white/10 flex-row gap-3">
        <Button title="Hotovo" size="lg" className="flex-1" onPress={() => router.replace('/')} />
        <Button title="Sdílet" variant="secondary" size="lg" className="px-5" onPress={handleShare} />
      </View>
    </SafeAreaView>
  )
}
