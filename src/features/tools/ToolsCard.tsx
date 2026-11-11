import { useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { epley1RM, percentTable } from '@/core'
import { Button, Card } from '@/components/ui'
import { PlateCalculator } from '@/components/PlateCalculator'
import { colors } from '@/theme/colors'

/** Nástroje mimo trénink: odhad 1RM s tabulkou procent a kalkulačka kotoučů. */
export function ToolsCard({ barWeightKg, stepKg }: { barWeightKg: number; stepKg: number }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [platesOpen, setPlatesOpen] = useState(false)

  const w = parseFloat(weight.replace(',', '.')) || 0
  const r = parseInt(reps, 10) || 0
  const e1rm = w > 0 && r > 0 ? epley1RM(w, r) : 0
  const rows = useMemo(() => percentTable(e1rm, stepKg), [e1rm, stepKg])

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Tools</Text>
      <Card className="gap-3">
        <Text className="text-sm font-semibold text-white">1RM estimate</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Weight in kilograms"
            className="h-12 flex-1 rounded-2xl bg-panel2 px-4 text-base text-white"
          />
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Repetitions"
            className="h-12 flex-1 rounded-2xl bg-panel2 px-4 text-base text-white"
          />
        </View>
        {e1rm > 0 ? (
          <View className="gap-1">
            <Text className="font-display text-2xl text-white" style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(e1rm * 10) / 10} kg
            </Text>
            {rows.map((row) => (
              <View key={row.percent} className="flex-row justify-between">
                <Text className="text-xs text-muted">{row.percent} %</Text>
                <Text className="text-xs text-white" style={{ fontVariant: ['tabular-nums'] }}>
                  {row.weight} kg · ~{row.reps} reps
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-xs text-muted">Enter a set to estimate your one-rep max.</Text>
        )}
        <Button title="Plate calculator" onPress={() => setPlatesOpen(true)} />
      </Card>
      <PlateCalculator
        visible={platesOpen}
        barWeightKg={barWeightKg}
        onClose={() => setPlatesOpen(false)}
      />
    </View>
  )
}
