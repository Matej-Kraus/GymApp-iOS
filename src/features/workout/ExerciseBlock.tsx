import { Pressable, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { Exercise, SetLog, SetRole } from '@/core'
import type { DraftEntry, DraftSet } from '@/lib/workoutDraft'
import { IconButton, Rule, Title, tnum } from '@/components/ui'
import { choose, confirm } from '@/lib/platform'
import { fmtSet } from '@/lib/format'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'
import { COL, SetRow, rirLabel } from './SetRow'

/**
 * Jeden cvik v tréninku: název, minulý výkon a cíl, tabulka sérií.
 * Všechno méně časté (historie, kotouče, poznámka, výměna, superset,
 * odebrání) je v nabídce pod „⋯", ať na stránce zůstanou jen série.
 */

type MenuAction = 'history' | 'plates' | 'note' | 'swap' | 'superset' | 'remove' | 'cancel'
type AddAction = SetRole | 'auto' | 'cancel'

interface Props {
  entry: DraftEntry
  exercise: Exercise
  lastWorking: SetLog | null
  onUpdateSet: (si: number, patch: Partial<DraftSet>) => void
  onToggleComplete: (si: number) => void
  onToggleSkip: (si: number) => void
  onDeleteSet: (si: number) => void
  onAddSet: (role: SetRole) => void
  onAutoWarmup: () => void
  onOpenPlates: () => void
  onOpenHistory: () => void
  onOpenNote: () => void
  onRemove: () => void
  /** Označení pozice v supersetu (A1), nebo null. */
  supersetLabel: string | null
  onToggleSuperset: () => void
  /** Kandidáti na náhradu, od nejvhodnějšího. */
  substitutes: Exercise[]
  onReplace: (replacement: Exercise) => void
  note: string
}

export function ExerciseBlock({
  entry,
  exercise,
  lastWorking,
  onUpdateSet,
  onToggleComplete,
  onToggleSkip,
  onDeleteSet,
  onAddSet,
  onAutoWarmup,
  onOpenPlates,
  onOpenHistory,
  onOpenNote,
  onRemove,
  supersetLabel,
  onToggleSuperset,
  substitutes,
  onReplace,
  note,
}: Props) {
  const t = tr()
  const w = t.workout
  const target = entry.sets.find((s) => s.role === 'working')?.suggestion ?? null

  async function openMenu() {
    const picked = await choose<MenuAction>({
      title: exercise.name,
      options: [
        { label: w.menuHistory, value: 'history', style: 'neutral' },
        { label: w.menuPlates, value: 'plates', style: 'neutral' },
        { label: w.menuNote, value: 'note', style: 'neutral' },
        ...(substitutes.length > 0
          ? [{ label: w.menuSwap, value: 'swap' as const, style: 'neutral' as const }]
          : []),
        {
          label: supersetLabel ? w.menuUnsuperset : w.menuSuperset,
          value: 'superset',
          style: 'neutral',
        },
        { label: w.menuRemove, value: 'remove', style: 'destructive' },
        { label: t.common.cancel, value: 'cancel', style: 'cancel' },
      ],
    })
    if (picked === 'history') onOpenHistory()
    if (picked === 'plates') onOpenPlates()
    if (picked === 'note') onOpenNote()
    if (picked === 'superset') onToggleSuperset()
    if (picked === 'swap') await pickSubstitute()
    if (picked === 'remove') {
      const yes = await confirm({
        title: w.removeTitle,
        message: exercise.name,
        confirmLabel: t.common.remove,
        destructive: true,
      })
      if (yes) onRemove()
    }
  }

  async function pickSubstitute() {
    const picked = await choose<string>({
      title: w.menuSwap,
      message: w.swapText(exercise.name),
      options: [
        ...substitutes.map((e) => ({ label: e.name, value: e.id, style: 'neutral' as const })),
        { label: t.common.cancel, value: '', style: 'cancel' as const },
      ],
    })
    const replacement = substitutes.find((e) => e.id === picked)
    if (replacement) onReplace(replacement)
  }

  async function addSet() {
    const picked = await choose<AddAction>({
      title: w.addSetTitle,
      options: [
        { label: w.role.working, value: 'working', style: 'neutral' },
        { label: w.role.backoff, value: 'backoff', style: 'neutral' },
        { label: w.role.warmup, value: 'warmup', style: 'neutral' },
        { label: w.autoWarmup, value: 'auto', style: 'neutral' },
        { label: t.common.cancel, value: 'cancel', style: 'cancel' },
      ],
    })
    if (picked === 'auto') onAutoWarmup()
    else if (picked && picked !== 'cancel') onAddSet(picked)
  }

  // Pořadí v tabulce: rozcvička, pracovní, back-off. Index do `entry.sets`
  // zůstává původní — obrazovka série adresuje pozicí.
  const ordered = (['warmup', 'working', 'backoff'] as const).flatMap((role) =>
    entry.sets.map((set, index) => ({ set, index })).filter((x) => x.set.role === role),
  )
  let workingNo = 0

  return (
    <View>
      <View className="flex-row items-start" style={{ marginRight: -10 }}>
        <Pressable
          onPress={onOpenHistory}
          accessibilityRole="button"
          accessibilityLabel={`${w.menuHistory}: ${exercise.name}`}
          className="flex-1 active:opacity-60"
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {supersetLabel ? (
              <View className="rounded border border-white px-1.5">
                <Text className="text-[13px] font-semibold text-white">{supersetLabel}</Text>
              </View>
            ) : null}
            <Title size="md" className="flex-1">
              {exercise.name}
            </Title>
          </View>
          <Text className="mt-1 text-[15px] text-muted" style={tnum}>
            {lastWorking
              ? w.last(
                  fmtSet(lastWorking.weight, lastWorking.reps) +
                    (lastWorking.rpe ? `, RIR ${rirLabel(String(lastWorking.rpe))}` : ''),
                )
              : w.first}
          </Text>
          {target ? (
            <Text className="text-[15px] font-medium text-white" style={tnum}>
              {w.target(fmtSet(target.weight, target.reps))}
            </Text>
          ) : null}
          {note ? (
            <Text className="mt-1 text-[14px] leading-[19px] text-faint" numberOfLines={2}>
              {note}
            </Text>
          ) : null}
        </Pressable>
        <IconButton icon="ellipsis-horizontal" label={w.more} onPress={openMenu} />
      </View>

      {/* Hlavička sloupců — šířky sedí se SetRow přes COL. */}
      <View className="mt-3 flex-row items-center pb-1.5" style={{ gap: COL.gap }}>
        <View style={{ width: COL.label }} />
        <Text className="flex-1 text-center text-[13px] text-faint">{t.common.kg}</Text>
        <Text className="flex-1 text-center text-[13px] text-faint">{t.common.reps}</Text>
        <Text className="text-center text-[13px] text-faint" style={{ width: COL.rir }}>
          {w.colRir}
        </Text>
        <View style={{ width: COL.done }} />
      </View>
      <Rule />

      <View style={{ paddingTop: 4 }}>
        {ordered.map(({ set, index }) => {
          const label =
            set.role === 'working' ? String(++workingNo) : w.roleShort[set.role]
          return (
            <SetRow
              key={set.id}
              set={set}
              label={label}
              onChange={(p) => onUpdateSet(index, p)}
              onToggleComplete={() => onToggleComplete(index)}
              onToggleSkip={() => onToggleSkip(index)}
              onDelete={() => onDeleteSet(index)}
            />
          )
        })}
      </View>

      <Pressable
        onPress={addSet}
        accessibilityRole="button"
        className="h-11 flex-row items-center active:opacity-60"
        style={{ gap: 6, paddingLeft: 6 }}
      >
        <Ionicons name="add" size={20} color={colors.muted} />
        <Text className="text-[15px] text-muted">{w.addSet}</Text>
      </Pressable>
    </View>
  )
}
