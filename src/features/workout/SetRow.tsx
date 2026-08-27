import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { SetRole } from '@/core'
import type { DraftSet } from '@/lib/workoutDraft'
import { cn } from '@/components/ui'
import { tapLight } from '@/lib/haptics'
import { colors } from '@/theme/colors'

/**
 * Jeden řádek série: váha, opakování, RIR, přeskočit, hotovo, smazat.
 *
 * RIR = kolik opakování zbývalo do selhání. Ukládá se pořád jako RPE
 * (RIR = 10 − RPE), takže historie i export zůstávají beze změny.
 * Je to vstup, na kterém stojí celý motor progrese — proto chipy s
 * popiskem, ne tlačítko cyklující šesti čísly bez vysvětlení.
 */

const RIR_OPTIONS: { rir: string; rpe: string; hint: string }[] = [
  { rir: '3+', rpe: '7', hint: 'Easy' },
  { rir: '2', rpe: '8', hint: 'On track' },
  { rir: '1', rpe: '9', hint: 'Hard' },
  { rir: '0', rpe: '10', hint: 'Failure' },
]

export function rirLabel(rpe: string): string {
  if (!rpe) return '—'
  const value = 10 - parseFloat(rpe)
  return value >= 3 ? '3+' : String(value)
}

export const ROLE_LABEL: Record<SetRole, string> = { warmup: 'W', working: '·', backoff: 'B' }

export function SetRow({
  set,
  onChange,
  onToggleComplete,
  onToggleSkip,
  onDelete,
  isWorking,
}: {
  set: DraftSet
  onChange: (patch: Partial<DraftSet>) => void
  onToggleComplete: () => void
  onToggleSkip: () => void
  onDelete: () => void
  isWorking?: boolean
}) {
  const accepted = set.completed && !set.skipped
  const [rirOpen, setRirOpen] = useState(false)

  function pickRir(rpe: string) {
    // Ťuknutí na už zvolený chip volbu zruší (zpět na nezadáno).
    onChange({ rpe: set.rpe === rpe ? '' : rpe })
    setRirOpen(false)
    tapLight()
  }

  return (
    <View className={cn('border-t border-white/10', set.skipped ? 'opacity-40' : '')}>
      <View
        className={cn(
          'flex-row items-center gap-1.5 px-3 py-1.5',
          set.skipped ? '' : isWorking && accepted ? 'bg-accent/10' : isWorking ? 'bg-accent/5' : '',
        )}
      >
        <Text className="w-4 text-center text-[10px] font-bold text-muted">
          {ROLE_LABEL[set.role]}
        </Text>
        {/* min-w-0: RN web nerespektuje flex-1 u TextInputu kvůli jeho
            vnitřní šířce a řádek pak přeteče přes pravý okraj. */}
        <TextInput
          keyboardType="decimal-pad"
          placeholder={set.suggestion ? String(set.suggestion.weight) : '—'}
          placeholderTextColor={colors.muted + '60'}
          value={set.weight}
          editable={!set.skipped}
          onChangeText={(t) => onChange({ weight: t })}
          accessibilityLabel="Weight in kg"
          className="flex-1 min-w-0 h-9 rounded-2xl bg-panel px-1 text-center font-display text-sm text-white"
          style={{ fontVariant: ['tabular-nums'] }}
        />
        <TextInput
          keyboardType="number-pad"
          placeholder={set.suggestion ? String(set.suggestion.reps) : '—'}
          placeholderTextColor={colors.muted + '60'}
          value={set.reps}
          editable={!set.skipped}
          onChangeText={(t) => onChange({ reps: t })}
          accessibilityLabel="Reps"
          className="flex-1 min-w-0 h-9 rounded-2xl bg-panel px-1 text-center font-display text-sm text-white"
          style={{ fontVariant: ['tabular-nums'] }}
        />
        <Pressable
          onPress={() => setRirOpen((v) => !v)}
          disabled={set.skipped}
          accessibilityLabel={
            set.rpe ? `Reps in reserve: ${rirLabel(set.rpe)}` : 'Set reps in reserve'
          }
          className={cn(
            'w-11 h-9 rounded-2xl items-center justify-center',
            rirOpen ? 'bg-panel2' : 'bg-panel',
          )}
        >
          <Text className={cn('text-xs', set.rpe ? 'text-white' : 'text-muted')}>
            {rirLabel(set.rpe)}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleSkip}
          hitSlop={8}
          accessibilityLabel={set.skipped ? 'Un-skip set' : 'Skip set'}
          className="w-7 h-9 rounded-2xl bg-panel2 items-center justify-center"
        >
          <Text className={cn('text-xs font-bold', set.skipped ? 'text-accent' : 'text-muted/40')}>
            —
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleComplete}
          disabled={set.skipped}
          accessibilityLabel={accepted ? 'Mark set as not done' : 'Mark set as done'}
          hitSlop={8}
          className={cn(
            'w-9 h-9 rounded-xl items-center justify-center',
            accepted ? 'bg-accent' : 'bg-panel',
          )}
        >
          <Text className={cn('text-sm font-bold', accepted ? 'text-black' : 'text-muted')}>
            {accepted ? '✓' : '○'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={12}
          accessibilityLabel="Delete set"
          className="w-5 h-9 items-center justify-center"
        >
          <Text className="text-muted/30 text-xs">✕</Text>
        </Pressable>
      </View>

      {rirOpen && !set.skipped ? (
        <View className="flex-row items-center gap-1.5 px-3 pb-2">
          <Text className="text-[10px] uppercase tracking-wider text-faint">Reps left</Text>
          {RIR_OPTIONS.map((o) => {
            const active = set.rpe === o.rpe
            return (
              <Pressable
                key={o.rpe}
                onPress={() => pickRir(o.rpe)}
                accessibilityLabel={`${o.hint} — ${o.rir} reps in reserve`}
                accessibilityState={{ selected: active }}
                className={cn(
                  'flex-1 h-11 rounded-2xl items-center justify-center',
                  active ? 'bg-accent' : 'bg-panel',
                )}
              >
                <Text className={cn('font-display text-sm', active ? 'text-black' : 'text-white')}>
                  {o.rir}
                </Text>
                <Text className={cn('text-[9px]', active ? 'text-black/70' : 'text-faint')}>
                  {o.hint}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
