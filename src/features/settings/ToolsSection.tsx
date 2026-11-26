import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { epley1RM, percentTable } from '@/core'
import { Button, Field, Num, Rule, tnum } from '@/components/ui'
import { PlateCalculator } from '@/components/PlateCalculator'
import { fmtNum } from '@/lib/format'
import { tr } from '@/i18n'

/** Nástroje mimo trénink: odhad 1RM s tabulkou procent a kalkulačka kotoučů. */
export function ToolsSection({ barWeightKg, stepKg }: { barWeightKg: number; stepKg: number }) {
  const t = tr()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [platesOpen, setPlatesOpen] = useState(false)

  const w = parseFloat(weight.replace(',', '.')) || 0
  const r = parseInt(reps, 10) || 0
  const e1rm = w > 0 && r > 0 ? epley1RM(w, r) : 0
  const rows = useMemo(() => percentTable(e1rm, stepKg), [e1rm, stepKg])

  return (
    <View>
      <Text className="mb-1.5 text-[15px] text-white">{t.tools.oneRm}</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        <Field className="flex-1" placeholder={t.tools.weight} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" accessibilityLabel={t.tools.weight} />
        <Field className="flex-1" placeholder={t.tools.reps} value={reps} onChangeText={setReps} keyboardType="number-pad" accessibilityLabel={t.tools.reps} />
      </View>
      {e1rm > 0 ? (
        <View className="mt-3">
          <Num className="text-[40px] leading-[44px]">
            {fmtNum(e1rm, 1)} {t.common.kg}
          </Num>
          <View className="mt-2">
            {rows.map((row) => (
              <View key={row.percent}>
                <Rule />
                <View className="flex-row items-center py-2">
                  <Text className="w-16 text-[15px] text-muted" style={tnum}>
                    {row.percent} %
                  </Text>
                  <Num className="flex-1 text-[20px]">
                    {fmtNum(row.weight, 2)} {t.common.kg}
                  </Num>
                  <Text className="text-[14px] text-muted" style={tnum}>
                    {t.tools.approxReps(row.reps)}
                  </Text>
                </View>
              </View>
            ))}
            <Rule />
          </View>
        </View>
      ) : (
        <Text className="mt-2 text-[14px] text-faint">{t.tools.enter}</Text>
      )}
      <Button className="mt-5" variant="secondary" title={t.tools.plates} onPress={() => setPlatesOpen(true)} />
      <PlateCalculator visible={platesOpen} barWeightKg={barWeightKg} onClose={() => setPlatesOpen(false)} />
    </View>
  )
}
