import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { DraftSet } from '@/lib/workoutDraft'
import { cn, tnum } from '@/components/ui'
import { tapLight } from '@/lib/haptics'
import { choose } from '@/lib/platform'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

/**
 * Jeden řádek série: označení, váha, opakování, RIR, hotovo.
 *
 * Rozepsaná série má vyplněná pole; hotová je „zapsaná" — pole ztratí výplň
 * a čísla zůstanou na stránce jako v deníku. Přeskočení a smazání jsou pod
 * ťuknutím na označení série, ať řádek nenese pět tlačítek.
 *
 * RIR = kolik opakování zbývalo do selhání. Ukládá se pořád jako RPE
 * (RIR = 10 − RPE), takže historie i export zůstávají beze změny.
 */

const RIR_OPTIONS = [
  { rir: '3+', rpe: '7', hint: 'easy' },
  { rir: '2', rpe: '8', hint: 'onTrack' },
  { rir: '1', rpe: '9', hint: 'hard' },
  { rir: '0', rpe: '10', hint: 'failure' },
] as const

export function rirLabel(rpe: string): string {
  if (!rpe) return '–'
  const value = 10 - parseFloat(rpe)
  return value >= 3 ? '3+' : String(value)
}

/** Šířky sloupců — hlavička tabulky v ExerciseBlock je bere odsud. */
export const COL = { label: 36, rir: 56, done: 48, gap: 8 } as const

export function SetRow({
  set,
  label,
  onChange,
  onToggleComplete,
  onToggleSkip,
  onDelete,
}: {
  set: DraftSet
  /** „R", „B" nebo pořadí pracovní série. */
  label: string
  onChange: (patch: Partial<DraftSet>) => void
  onToggleComplete: () => void
  onToggleSkip: () => void
  onDelete: () => void
}) {
  const t = tr().workout
  const done = set.completed && !set.skipped
  const [rirOpen, setRirOpen] = useState(false)

  function pickRir(rpe: string) {
    // Ťuknutí na už zvolenou hodnotu ji zruší (zpět na nezadáno).
    onChange({ rpe: set.rpe === rpe ? '' : rpe })
    setRirOpen(false)
    tapLight()
  }

  async function openMenu() {
    const picked = await choose<'skip' | 'delete' | 'cancel'>({
      title: t.setMenuTitle(label),
      options: [
        { label: set.skipped ? t.unskipSet : t.skipSet, value: 'skip', style: 'neutral' },
        { label: t.deleteSet, value: 'delete', style: 'destructive' },
        { label: tr().common.cancel, value: 'cancel', style: 'cancel' },
      ],
    })
    if (picked === 'skip') onToggleSkip()
    if (picked === 'delete') onDelete()
  }

  // Pole: vyplněné, dokud se píše; po odškrtnutí jen číslo na stránce.
  const field = cn(
    'h-12 min-w-0 flex-1 rounded-lg text-center font-display text-[26px] text-white',
    done ? '' : 'bg-panel2',
  )

  return (
    <View style={{ opacity: set.skipped ? 0.35 : 1 }}>
      <View className="flex-row items-center" style={{ gap: COL.gap, paddingVertical: 4 }}>
        <Pressable
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={t.setMenuTitle(label)}
          className="h-12 items-center justify-center active:opacity-50"
          style={{ width: COL.label }}
        >
          <Text
            className={cn('text-[16px] font-medium', set.role === 'working' ? 'text-white' : 'text-faint')}
            style={tnum}
          >
            {label}
          </Text>
        </Pressable>
        {/* min-w-0: RN web nerespektuje flex-1 u TextInputu kvůli jeho
            vnitřní šířce a řádek pak přeteče přes pravý okraj. */}
        <TextInput
          keyboardType="decimal-pad"
          placeholder={set.suggestion ? String(set.suggestion.weight) : ''}
          placeholderTextColor={colors.faint}
          value={set.weight}
          editable={!set.skipped}
          onChangeText={(v) => onChange({ weight: v })}
          accessibilityLabel={t.weightLabel}
          selectTextOnFocus
          className={field}
          style={tnum}
        />
        <TextInput
          keyboardType="number-pad"
          placeholder={set.suggestion ? String(set.suggestion.reps) : ''}
          placeholderTextColor={colors.faint}
          value={set.reps}
          editable={!set.skipped}
          onChangeText={(v) => onChange({ reps: v })}
          accessibilityLabel={t.repsLabel}
          selectTextOnFocus
          className={field}
          style={tnum}
        />
        <Pressable
          onPress={() => setRirOpen((v) => !v)}
          disabled={set.skipped}
          accessibilityRole="button"
          accessibilityLabel={set.rpe ? t.rirSet(rirLabel(set.rpe)) : t.rirTitle}
          className={cn('h-12 items-center justify-center rounded-lg', done && !rirOpen ? '' : 'bg-panel2')}
          style={{ width: COL.rir }}
        >
          <Text className={cn('font-display text-[22px]', set.rpe ? 'text-white' : 'text-faint')} style={tnum}>
            {rirLabel(set.rpe)}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleComplete}
          disabled={set.skipped}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? t.markUndone : t.markDone}
          className={cn('h-12 items-center justify-center rounded-lg', done ? 'bg-accent' : 'bg-panel2')}
          style={{ width: COL.done }}
        >
          <Ionicons name="checkmark" size={24} color={done ? colors.accentText : colors.faint} />
        </Pressable>
      </View>

      {rirOpen && !set.skipped ? (
        <View style={{ paddingLeft: COL.label + COL.gap, paddingBottom: 8, paddingTop: 2 }}>
          <Text className="mb-1.5 text-[14px] text-muted">{t.rirTitle}</Text>
          <View className="flex-row" style={{ gap: 6 }}>
            {RIR_OPTIONS.map((o) => {
              const active = set.rpe === o.rpe
              return (
                <Pressable
                  key={o.rpe}
                  onPress={() => pickRir(o.rpe)}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.rir}, ${t.rirHints[o.hint]}`}
                  accessibilityState={{ selected: active }}
                  className={cn('flex-1 items-center rounded-lg py-1.5', active ? 'bg-white' : 'bg-panel2')}
                >
                  <Text className={cn('font-display text-[22px]', active ? 'text-bg' : 'text-white')}>
                    {o.rir}
                  </Text>
                  <Text className={cn('text-[12px]', active ? 'text-bg' : 'text-muted')}>
                    {t.rirHints[o.hint]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}
    </View>
  )
}
