import { useMemo } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated'
import { platesForBarbell } from '@/core/plates'
import { colors, plateColor } from '@/theme/colors'

/** Naložená osa — podpisový prvek celé appky.
 *
 *  Vykreslí, jak reálně vypadá osa naložená na zadanou váhu: kotouče v jejich
 *  skutečných IWF barvách, seřazené od největšího. Když se váha změní, kotouče
 *  najedou a odjedou. Uživatel čte váhu barvou dřív, než přečte číslo —
 *  přesně jako v posilovně.
 *
 *  Když se váha nedá složit z dostupných kotoučů, zbytek se přizná. */

/** Výška kotouče podle hmotnosti — poměry odpovídají reálným průměrům. */
const PLATE_HEIGHT: Record<number, number> = {
  25: 1,
  20: 0.95,
  15: 0.8,
  10: 0.7,
  5: 0.52,
  2.5: 0.4,
  1.25: 0.32,
}

export function LoadedBar({
  weightKg,
  barKg = 20,
  smallestPlateKg = 1.25,
  height = 56,
  showLabels = true,
}: {
  weightKg: number
  barKg?: number
  smallestPlateKg?: number
  height?: number
  showLabels?: boolean
}) {
  const result = useMemo(
    () =>
      platesForBarbell(
        weightKg,
        barKg,
        [25, 20, 15, 10, 5, 2.5, 1.25].filter((p) => p >= smallestPlateKg),
      ),
    [weightKg, barKg, smallestPlateKg],
  )

  // Rozvine počty na jednotlivé kotouče: [25, 25, 10, 2.5] …
  const plates = useMemo(
    () => result.perSide.flatMap(({ plate, count }) => Array(count).fill(plate) as number[]),
    [result],
  )

  if (result.belowBar) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-faint">
          Below bar weight
        </Text>
      </View>
    )
  }

  const sleeve = height * 0.16

  return (
    <View>
      <View className="flex-row items-center justify-center" style={{ height }}>
        {/* levá strana — zrcadlově, od nejmenšího ven */}
        <View className="flex-row items-center justify-end">
          {[...plates].reverse().map((p, i) => (
            <Plate key={`l-${i}-${p}`} kg={p} height={height} />
          ))}
        </View>

        {/* hřídel */}
        <View
          className="rounded-sm"
          style={{ height: sleeve, width: 34, backgroundColor: colors.faint }}
        />

        {/* pravá strana — od největšího ven */}
        <View className="flex-row items-center">
          {plates.map((p, i) => (
            <Plate key={`r-${i}-${p}`} kg={p} height={height} />
          ))}
        </View>
      </View>

      {showLabels ? (
        <View className="mt-2 flex-row items-center justify-center gap-2">
          <Text className="font-mono text-[10px] uppercase tracking-[1.5px] text-faint">
            bar {barKg}
          </Text>
          {result.perSide.map(({ plate, count }) => (
            <View key={plate} className="flex-row items-center gap-1">
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: plateColor(plate) }}
              />
              <Text className="font-mono text-[10px] text-muted" >
                {plate}
                <Text className="text-faint">×{count}</Text>
              </Text>
            </View>
          ))}
          {result.remainderKg > 0.01 ? (
            <Text className="font-mono text-[10px] uppercase tracking-[1px] text-over">
              +{result.remainderKg.toFixed(2)} off
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function Plate({ kg, height }: { kg: number; height: number }) {
  const h = height * (PLATE_HEIGHT[kg] ?? 0.3)
  const color = plateColor(kg)
  // Malé kotouče jsou i užší — jinak by 1,25 vypadal jako 25.
  const w = kg >= 15 ? 11 : kg >= 5 ? 9 : 7

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={{
        height: h,
        width: w,
        backgroundColor: color,
        borderRadius: 2,
        marginHorizontal: 1,
        // bílý kotouč potřebuje obrys, aby nesplynul s ničím
        borderWidth: kg === 5 ? 1 : 0,
        borderColor: colors.line,
      }}
    />
  )
}
