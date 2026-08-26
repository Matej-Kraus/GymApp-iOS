import { ReactNode, useEffect } from 'react'
import { Text, View } from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/theme/colors'
import { cn } from '@/components/ui'

/** Text s přejíždějícím světlem.
 *
 *  Web verze (Kokonut UI) animuje `backgroundPosition` u gradientu oříznutého
 *  na tvar písma. V RN nic takového není, takže totéž skládáme z MaskedView:
 *  maskou je samotný text, pod ní jezdí gradientní pruh.
 *
 *  Časování drží web předlohu: 2,5 s, lineárně, donekonečna. */
export function ShimmerText({
  children,
  className,
  color = colors.accent,
  durationMs = 2500,
}: {
  children: string
  className?: string
  color?: string
  durationMs?: number
}) {
  const x = useSharedValue(-1)

  useEffect(() => {
    x.value = -1
    x.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    )
  }, [x, durationMs])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 100}%` }],
  }))

  return (
    <MaskedView
      maskElement={
        <Text className={cn('font-display', className)} style={{ backgroundColor: 'transparent' }}>
          {children}
        </Text>
      }
    >
      {/* Základní barva textu */}
      <Text className={cn('font-display', className)} style={{ color }}>
        {children}
      </Text>
      {/* Světelný pruh přes něj */}
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, style]}>
        <LinearGradient
          colors={['transparent', '#FFFFFF', 'transparent']}
          locations={[0.35, 0.5, 0.65]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, opacity: 0.85 }}
        />
      </Animated.View>
    </MaskedView>
  )
}

/** Kostra pro načítání — stejný přejezd, ale přes plochu místo písma.
 *  Bklit tenhle stav používá u grafů, než dorazí data. */
export function SkeletonBlock({
  height = 16,
  className,
}: {
  height?: number
  className?: string
}) {
  const x = useSharedValue(-1)

  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false)
  }, [x])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 100}%` }],
  }))

  return (
    <View className={cn('overflow-hidden rounded-xl bg-panel2', className)} style={{ height }}>
      <Animated.View style={[{ ...StyleSheetAbsolute }, style]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  )
}

const StyleSheetAbsolute = { position: 'absolute' as const, top: 0, bottom: 0, left: 0, right: 0 }

/** Karta se světelným lemem — RN obdoba „liquid glass" z Kokonutu.
 *  Gradient místo backdrop-filtru, který v RN neexistuje. */
export function GlowCard({
  children,
  color = colors.accent,
  className,
}: {
  children: ReactNode
  color?: string
  className?: string
}) {
  return (
    <View
      className={cn('overflow-hidden rounded-3xl border bg-panel', className)}
      style={{ borderColor: `${color}40` }}
    >
      <LinearGradient
        colors={[`${color}1A`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheetAbsolute}
      />
      {children}
    </View>
  )
}
