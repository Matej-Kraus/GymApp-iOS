import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { platesForBarbell, DEFAULT_BAR_KG } from '@/core'
import { colors } from '@/theme/colors'
import { cn } from '@/components/ui'

const BAR_OPTIONS = [20, 15, 10]
// Vizuální výška kotouče dle hmotnosti (větší kotouč = vyšší).
const PLATE_HEIGHT: Record<number, number> = {
  25: 96, 20: 88, 15: 76, 10: 64, 5: 50, 2.5: 40, 1.25: 32,
}
const PLATE_COLOR: Record<number, string> = {
  25: '#C8A961', 20: '#B9985A', 15: '#A98B52', 10: '#8A7444', 5: '#6E5C38', 2.5: '#54472C', 1.25: '#3E3422',
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}

/** Modal kalkulačky kotoučů — co naložit na osu pro cílovou váhu. */
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
  const [weight, setWeight] = useState<string>('')
  const [bar, setBar] = useState<number>(barWeightKg)

  // Při otevření předvyplň cílovou váhu.
  const seed = initialWeight && initialWeight > 0 ? String(initialWeight) : ''
  const [seededFor, setSeededFor] = useState<string>('')
  if (visible && seededFor !== seed) {
    setSeededFor(seed)
    setWeight(seed)
    setBar(barWeightKg)
  }

  const target = parseFloat(weight.replace(',', '.')) || 0
  const result = useMemo(() => platesForBarbell(target, bar), [target, bar])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Bez tohohle klávesnice překryje celou vizualizaci osy — input je
          nahoře, ale to podstatné je pod ním. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
      <SafeAreaView className="flex-1 bg-bg/95">
        <View className="flex-1 px-4 pt-4">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="font-display text-xl text-white">Plate calculator</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Text className="text-muted text-xl">✕</Text>
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">Target weight (kg)</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 100"
              placeholderTextColor={colors.muted}
              className="h-14 rounded-2xl bg-panel2 px-4 font-display text-2xl text-white"
              style={{ fontVariant: ['tabular-nums'] }}
            />
          </View>

          <View className="mt-4 gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">Hmotnost osy</Text>
            <View className="flex-row gap-1 rounded-2xl bg-panel2 p-1">
              {BAR_OPTIONS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setBar(b)}
                  className={cn('h-10 flex-1 items-center justify-center rounded-xl', bar === b && 'bg-accent')}
                >
                  <Text className={cn('text-sm font-semibold', bar === b ? 'text-black' : 'text-muted')}>{b} kg</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Vizualizace osy */}
          <View className="mt-8 items-center">
            {target <= 0 ? (
              <Text className="text-sm text-muted py-10">Enter a target weight.</Text>
            ) : result.belowBar ? (
              <Text className="text-sm text-muted py-10">Cíl je menší než samotná osa ({bar} kg).</Text>
            ) : result.perSide.length === 0 ? (
              <Text className="text-sm text-muted py-10">Prázdná osa ({bar} kg) — žádné kotouče.</Text>
            ) : (
              <View className="w-full items-center">
                <View className="flex-row items-center justify-center" style={{ height: 110 }}>
                  {/* polovina osy */}
                  <View style={{ width: 28, height: 6, backgroundColor: '#6b6b72', borderRadius: 3 }} />
                  {result.perSide.flatMap((p) =>
                    Array.from({ length: p.count }).map((_, i) => (
                      <View
                        key={`${p.plate}-${i}`}
                        style={{
                          width: 14,
                          height: PLATE_HEIGHT[p.plate] ?? 40,
                          backgroundColor: PLATE_COLOR[p.plate] ?? colors.accent,
                          borderRadius: 3,
                          marginHorizontal: 1.5,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.12)',
                        }}
                      />
                    )),
                  )}
                  {/* zarážka */}
                  <View style={{ width: 8, height: 18, backgroundColor: '#4a4a50', borderRadius: 2, marginLeft: 3 }} />
                </View>

                <Text className="mt-6 text-center text-sm text-muted">Per side</Text>
                <View className="mt-2 flex-row flex-wrap justify-center gap-2">
                  {result.perSide.map((p) => (
                    <View key={p.plate} className="rounded-xl bg-panel2 px-3 py-2">
                      <Text className="font-display text-base text-white" style={{ fontVariant: ['tabular-nums'] }}>
                        {p.count}× {fmt(p.plate)}
                      </Text>
                    </View>
                  ))}
                </View>

                {result.remainderKg > 0 ? (
                  <Text className="mt-4 text-center text-xs text-danger">
                    Nelze přesně naložit — naloženo {fmt(result.achievableKg)} kg (chybí {fmt(result.remainderKg)} kg).
                  </Text>
                ) : (
                  <Text className="mt-4 text-center text-xs text-accent">
                    Celkem {fmt(result.achievableKg)} kg na ose.
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
