import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import type { Exercise, SetLog, SetRole } from '@/core'
import type { DraftEntry, DraftSet } from '@/lib/workoutDraft'
import { ExerciseImage } from '@/components/ExerciseImage'
import { choose, confirm } from '@/lib/platform'
import { colors } from '@/theme/colors'
import { SetRow, rirLabel } from './SetRow'

/**
 * Jeden cvik v tréninku: záhlaví s návrhem, série po skupinách a tlačítka
 * na přidání dalších sérií.
 */

interface Props {
  entry: DraftEntry
  exercise: Exercise
  index: number
  lastWorking: SetLog | null
  onUpdateSet: (si: number, patch: Partial<DraftSet>) => void
  onToggleComplete: (si: number) => void
  onToggleSkip: (si: number) => void
  onDeleteSet: (si: number) => void
  onAddSet: (role: SetRole) => void
  onAutoWarmup: () => void
  onOpenPlates: () => void
  onRemove: () => void
  /** Označení pozice v supersetu (A1), nebo null. */
  supersetLabel: string | null
  onToggleSuperset: () => void
  /** Kandidáti na náhradu, od nejvhodnějšího. */
  substitutes: Exercise[]
  onReplace: (replacement: Exercise) => void
  note: string
  onChangeNote: (note: string) => void
}

/** Série i s původním indexem — obrazovka je adresuje pozicí v `entry.sets`. */
interface Indexed {
  set: DraftSet
  index: number
}

export function ExerciseCard({
  entry,
  exercise,
  index,
  lastWorking,
  onUpdateSet,
  onToggleComplete,
  onToggleSkip,
  onDeleteSet,
  onAddSet,
  onAutoWarmup,
  onOpenPlates,
  onRemove,
  supersetLabel,
  onToggleSuperset,
  substitutes,
  onReplace,
  note,
  onChangeNote,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false)

  async function pickSubstitute() {
    if (substitutes.length === 0) return
    const picked = await choose<string>({
      title: 'Swap exercise',
      message: `Something that trains ${exercise.name} the same way.`,
      options: [
        ...substitutes.map((e) => ({ label: e.name, value: e.id, style: 'neutral' as const })),
        { label: 'Cancel', value: '', style: 'cancel' as const },
      ],
    })
    const replacement = substitutes.find((e) => e.id === picked)
    if (replacement) onReplace(replacement)
  }
  // Jeden průchod místo tří `entry.sets.map()` s filtrem na null. Dřív se
  // seznam procházel pro každou roli znovu a vyráběl null uzly k zahození.
  const grouped = useMemo(() => {
    const out: Record<SetRole, Indexed[]> = { warmup: [], working: [], backoff: [] }
    entry.sets.forEach((set, i) => out[set.role].push({ set, index: i }))
    return out
  }, [entry.sets])

  const suggestion = grouped.working[0]?.set.suggestion ?? null

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 50).springify().damping(18)}
      className="rounded-3xl bg-panel border border-white/[0.06] overflow-hidden"
    >
      <View className="flex-row items-center gap-3 px-3 py-2.5 border-b border-white/10">
        <ExerciseImage exercise={exercise} size={40} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            {supersetLabel ? (
              <View className="rounded-md bg-accent/20 px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-accent">{supersetLabel}</Text>
              </View>
            ) : null}
            <Text className="flex-1 font-display text-base text-white" numberOfLines={1}>
              {exercise.name}
            </Text>
          </View>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {exercise.muscleGroup}
            {lastWorking
              ? ` · last: ${lastWorking.reps}×${lastWorking.weight} kg${
                  lastWorking.rpe ? ` · RIR ${rirLabel(String(lastWorking.rpe))}` : ''
                }`
              : ''}
          </Text>
        </View>
        <Pressable
          onPress={onOpenPlates}
          hitSlop={8}
          accessibilityLabel="Plate calculator"
          className="h-9 w-9 items-center justify-center rounded-2xl bg-panel2"
        >
          <Text className="text-sm">🏋️</Text>
        </Pressable>
        {suggestion ? (
          <View className="rounded-full bg-accent/15 px-2 py-0.5">
            <Text
              className="text-[10px] font-bold text-accent"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              🎯 {suggestion.weight}×{suggestion.reps}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={async () => {
            const yes = await confirm({
              title: 'Remove exercise?',
              message: exercise.name,
              confirmLabel: 'Remove',
              destructive: true,
            })
            if (yes) onRemove()
          }}
          hitSlop={10}
          accessibilityLabel="Remove exercise"
        >
          <Text className="text-muted/40 text-base">✕</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 px-3 py-1.5 border-b border-white/[0.06]">
        <Pressable onPress={pickSubstitute} disabled={substitutes.length === 0} hitSlop={8}>
          <Text
            className={substitutes.length === 0 ? 'text-[11px] text-faint' : 'text-[11px] text-muted'}
          >
            Swap
          </Text>
        </Pressable>
        <Text className="text-faint">·</Text>
        <Pressable onPress={onToggleSuperset} hitSlop={8}>
          <Text className="text-[11px] text-muted">
            {supersetLabel ? 'Un-superset' : 'Superset with next'}
          </Text>
        </Pressable>
        <Text className="text-faint">·</Text>
        <Pressable onPress={() => setNoteOpen((v) => !v)} hitSlop={8}>
          <Text className={note ? 'text-[11px] text-accent' : 'text-[11px] text-muted'}>
            {note ? 'Note ✓' : 'Note'}
          </Text>
        </Pressable>
      </View>

      {noteOpen ? (
        <View className="px-3 py-2 border-b border-white/[0.06]">
          <TextInput
            value={note}
            onChangeText={onChangeNote}
            placeholder="Seat height, grip width, cues…"
            placeholderTextColor={colors.muted}
            multiline
            accessibilityLabel={`Note for ${exercise.name}`}
            className="rounded-2xl bg-panel2 px-3 py-2 text-sm text-white min-h-12"
          />
          <Text className="mt-1 text-[10px] text-faint">Saved for this exercise, not just today.</Text>
        </View>
      ) : null}

      {/* Hlavička sloupců — šířky musí sedět se SetRow. */}
      <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-panel2">
        <Text className="w-4" />
        <Text className="flex-1 min-w-0 text-center text-[9px] text-muted uppercase font-semibold">
          kg
        </Text>
        <Text className="flex-1 min-w-0 text-center text-[9px] text-muted uppercase font-semibold">
          rep
        </Text>
        <Text className="w-11 text-center text-[9px] text-muted uppercase font-semibold">RIR</Text>
        <View className="w-7" />
        <View className="w-9" />
        <View className="w-5" />
      </View>

      {grouped.warmup.map(({ set, index: si }) => (
        <SetRow
          key={set.id}
          set={set}
          onChange={(p) => onUpdateSet(si, p)}
          onToggleComplete={() => onToggleComplete(si)}
          onToggleSkip={() => onToggleSkip(si)}
          onDelete={() => onDeleteSet(si)}
        />
      ))}

      <View className="flex-row items-center justify-between px-3 py-1 bg-accent/5 border-t border-white/10">
        <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">
          Working
        </Text>
        <Pressable onPress={onAutoWarmup} hitSlop={10} accessibilityLabel="Auto warm-up">
          <Text className="text-[10px] text-accent/60">🔥 Auto warmup</Text>
        </Pressable>
      </View>
      {grouped.working.map(({ set, index: si }) => (
        <SetRow
          key={set.id}
          set={set}
          isWorking
          onChange={(p) => onUpdateSet(si, p)}
          onToggleComplete={() => onToggleComplete(si)}
          onToggleSkip={() => onToggleSkip(si)}
          onDelete={() => onDeleteSet(si)}
        />
      ))}

      <View className="px-3 py-1 bg-accent/5 border-t border-white/10">
        <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">
          Back-off
        </Text>
      </View>
      {grouped.backoff.map(({ set, index: si }) => (
        <SetRow
          key={set.id}
          set={set}
          onChange={(p) => onUpdateSet(si, p)}
          onToggleComplete={() => onToggleComplete(si)}
          onToggleSkip={() => onToggleSkip(si)}
          onDelete={() => onDeleteSet(si)}
        />
      ))}

      <View className="flex-row gap-2 px-3 py-2.5 border-t border-white/10">
        <Pressable
          onPress={() => onAddSet('warmup')}
          accessibilityLabel="Add warm-up set"
          className="flex-1 border border-dashed border-white/15 rounded-xl py-2.5 items-center"
        >
          <Text className="text-xs text-muted/50">+ W</Text>
        </Pressable>
        <Pressable
          onPress={() => onAddSet('working')}
          accessibilityLabel="Add working set"
          className="flex-[2] border border-dashed border-white/15 rounded-xl py-2.5 items-center"
        >
          <Text className="text-xs text-muted">+ Working</Text>
        </Pressable>
        <Pressable
          onPress={() => onAddSet('backoff')}
          accessibilityLabel="Add back-off set"
          className="flex-1 border border-dashed border-accent/20 rounded-xl py-2.5 items-center"
        >
          <Text className="text-xs text-accent/50">+ B</Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}
