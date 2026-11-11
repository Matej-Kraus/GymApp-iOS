import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { platesForBarbell, DEFAULT_BAR_KG } from '@/core'
import { Field, Num, Segmented, Sheet } from '@/components/ui'
import { LoadedBar } from '@/components/LoadedBar'
import { fmtNum } from '@/lib/format'
import { plateColor } from '@/theme/colors'
import { tr } from '@/i18n'

const BAR_OPTIONS = ['20', '15', '10'] as const

/** Sheet kalkulačky kotoučů — co naložit na osu pro cílovou váhu. */
export function PlateCalculator({
  visible,
  initialWeight,
  barWeightKg = DEFAULT_BAR_KG,
  onClose,
}: {
  visible: boolean
  initialWeight?: number | null
  barWeightKg?: number
  onClose: () => void
}) {
  const t = tr().plates
  const [weight, setWeight] = useState<string>('')
  const [bar, setBar] = useState<number>(barWeightKg)

  // Při otevření předvyplň cílovou váhu.
  const seed = initialWeight && initialWeight > 0 ? String(initialWeight) : ''
  const [seededFor, setSeededFor] = useState<string | null>(null)
  if (visible && seededFor !== seed) {
    setSeededFor(seed)
    setWeight(seed)
    setBar(barWeightKg)
  }
  if (!visible && seededFor !== null) setSeededFor(null)

  const target = parseFloat(weight.replace(',', '.')) || 0
  const result = useMemo(() => platesForBarbell(target, bar), [target, bar])

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <Field
        label={t.target}
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={setWeight}
        selectTextOnFocus
      />
      <Text className="mb-1.5 mt-4 text-[13px] text-muted">{t.bar}</Text>
      <Segmented
        options={BAR_OPTIONS.map((b) => ({ value: b, label: `${b} kg` }))}
        value={String(bar) as (typeof BAR_OPTIONS)[number]}
        onChange={(v) => setBar(Number(v))}
      />

      <View className="justify-center py-6" style={{ minHeight: 190 }}>
        {target <= 0 ? (
          <Text className="text-[16px] text-muted">{t.enter}</Text>
        ) : result.belowBar ? (
          <Text className="text-[16px] text-muted">{t.belowBar(fmtNum(bar))}</Text>
        ) : result.perSide.length === 0 ? (
          <Text className="text-[16px] text-muted">{t.emptyBar(fmtNum(bar))}</Text>
        ) : (
          <View>
            <LoadedBar weightKg={target} barKg={bar} height={84} showLabels={false} />
            <Text className="mb-1 mt-5 text-[13px] text-muted">{t.perSide}</Text>
            <View className="flex-row flex-wrap" style={{ columnGap: 18, rowGap: 2 }}>
              {result.perSide.map((p) => (
                <View key={p.plate} className="flex-row items-center" style={{ gap: 6 }}>
                  {/* Barva kotouče nese informaci — stejná jako na ose výš. */}
                  <View style={{ width: 6, height: 20, borderRadius: 2, backgroundColor: plateColor(p.plate) }} />
                  <Num className="text-[24px] leading-[30px]">
                    {p.count} × {fmtNum(p.plate, 2)}
                  </Num>
                </View>
              ))}
            </View>
            <Text className={result.remainderKg > 0 ? 'mt-3 text-[14px] text-warn' : 'mt-3 text-[14px] text-muted'}>
              {result.remainderKg > 0
                ? t.inexact(fmtNum(result.achievableKg, 2), fmtNum(result.remainderKg, 2))
                : t.total(fmtNum(result.achievableKg, 2))}
            </Text>
          </View>
        )}
      </View>
    </Sheet>
  )
}
