import { ReactNode, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/theme/colors'

/** PLATE CODE — design systém.
 *
 *  Ploché panely s hairline okrajem místo gradientů, verzálky v Archivo Black
 *  na nadpisy, IBM Plex Mono na všechna čísla. Sytá barva patří jen kotoučům
 *  a stavům objemu — nikde jinde, aby si udržela význam.
 *
 *  POZOR: `font-display` se nikdy nekombinuje s `font-bold`. Archivo Black
 *  je samostatný soubor; přidaná váha by rodinu shodila na systémový fallback. */

/** Spojí podmíněně třídy (ignoruje prázdné / false hodnoty). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Tabulkové číslice — data musí sedět v zákrytu jako na měřidle. */
export const tnum = { fontVariant: ['tabular-nums' as const] }

/** Odpočítá číslo nahoru při změně. Vrací aktuální hodnotu k vykreslení. */
export function useCountUp(target: number, durationMs = 550): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const start = Date.now()

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      // easeOutCubic — rychlý náběh, měkké dosednutí
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, durationMs])

  return value
}

/** Plochý panel s hairline okrajem — základ pro karty a statistiky. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('rounded-lg border border-line bg-panel', className)}>{children}</View>
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantBox: Record<Variant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-panel2 border border-line',
  ghost: '',
  danger: 'border border-danger/50',
}
const variantText: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-muted',
  danger: 'text-danger',
}
const sizeBox: Record<Size, string> = {
  sm: 'h-11 px-4', // 44pt — minimum podle Apple HIG
  md: 'h-12 px-5',
  lg: 'h-14 px-6',
}
const sizeText: Record<Size, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
  lg: 'text-base',
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  className,
}: {
  title: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  disabled?: boolean
  className?: string
}) {
  const pressed = useSharedValue(0)
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.03, { damping: 18, stiffness: 320 }) }],
    opacity: withTiming(1 - pressed.value * 0.15, { duration: 90 }),
  }))

  return (
    <Animated.View style={style} className={className}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        className={cn(
          'flex-row items-center justify-center rounded-lg',
          variantBox[variant],
          sizeBox[size],
          disabled && 'opacity-40',
        )}
      >
        <Text
          className={cn(
            'font-display uppercase tracking-[1.5px]',
            variantText[variant],
            sizeText[size],
          )}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

/** Karta — základní plocha pro obsah. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn('p-4', className)}>{children}</Panel>
}

/** Hlavička obrazovky: eyebrow + velký titulek + volitelná akce vpravo. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1">
        {subtitle ? (
          <Text className="font-mono text-[10px] uppercase tracking-[2.5px] text-accent">
            {subtitle}
          </Text>
        ) : null}
        <Text className="mt-1.5 font-display text-[28px] uppercase leading-[32px] tracking-[-0.5px] text-white">
          {title}
        </Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}

/** Popisek sekce — hairline linka a mono verzálky. */
export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center gap-3">
      <Text className="font-mono text-[10px] uppercase tracking-[2px] text-faint">{children}</Text>
      <View className="h-px flex-1 bg-line" />
      {action}
    </View>
  )
}

/** Prázdný stav — pozvánka k akci, ne omluva. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <View className="items-center justify-center rounded-lg border border-dashed border-line px-6 py-12">
      <Text className="text-center font-display text-base uppercase tracking-wide text-white">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-muted">{description}</Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  )
}

/** Statistika: velké mono číslo + popisek. Čísla jsou hrdinové obrazovky. */
export function Stat({
  label,
  value,
  unit,
  animate = false,
  decimals = 0,
}: {
  label: string
  value: ReactNode
  unit?: string
  /** Když je hodnota číslo, vyjede odpočtem nahoru. */
  animate?: boolean
  decimals?: number
}) {
  const numeric = typeof value === 'number' ? value : 0
  const counted = useCountUp(animate && typeof value === 'number' ? numeric : numeric, 550)
  const shown =
    animate && typeof value === 'number' ? counted.toFixed(decimals) : value

  return (
    <Panel className="flex-1 px-3.5 py-3">
      <View className="flex-row items-baseline">
        <Text className="font-mono-semibold text-[24px] leading-tight text-white" style={tnum}>
          {shown}
        </Text>
        {unit ? <Text className="ml-1 font-mono text-xs text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-2 font-mono text-[10px] uppercase tracking-[1.5px] text-faint">
        {label}
      </Text>
    </Panel>
  )
}

/** Chip / pill — filtr, volba, štítek. Dřív duplikovaný na pěti místech. */
export function Chip({
  label,
  active,
  onPress,
  color,
  className,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  /** Vlastní barva aktivního stavu (např. barva kotouče nebo pásma objemu). */
  color?: string
  className?: string
}) {
  const pressed = useSharedValue(0)
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.05, { damping: 18, stiffness: 340 }) }],
  }))

  return (
    <Animated.View style={style} className={className}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
        className={cn(
          'h-9 justify-center rounded-md border px-3',
          active ? 'border-accent bg-accent' : 'border-line bg-panel',
        )}
      >
        <Text
          className={cn(
            'font-mono text-[11px] uppercase tracking-[1px]',
            active ? 'text-white' : 'text-muted',
          )}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

/** Segmentovaný přepínač. Dřív ručně kopírovaný na třech obrazovkách. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <View className={cn('flex-row rounded-lg border border-line bg-panel p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={cn(
              'h-9 flex-1 items-center justify-center rounded-md',
              active && 'bg-accent',
            )}
          >
            <Text
              className={cn(
                'font-mono text-[11px] uppercase tracking-[1px]',
                active ? 'text-white' : 'text-muted',
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Přepínač. Palec plynule přejíždí — dřív skákal bez animace. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const on = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    on.value = value ? 1 : 0
  }, [value, on])

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(on.value * 20, { damping: 20, stiffness: 300 }) }],
  }))
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on.value ? colors.accent : colors.panel2, { duration: 160 }),
    borderColor: withTiming(on.value ? colors.accent : colors.line, { duration: 160 }),
  }))

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={10}>
      <Animated.View className="h-7 w-12 justify-center rounded-full border px-0.5" style={track}>
        <Animated.View className="h-6 w-6 rounded-full bg-white" style={knob} />
      </Animated.View>
    </Pressable>
  )
}

/** Ukazatel postupu. Šířka dojede plynule. */
export function ProgressBar({
  value,
  color = colors.accent,
  className,
}: {
  /** 0–1 */
  value: number
  color?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, value))
  const w = useSharedValue(pct)

  useEffect(() => {
    w.value = pct
  }, [pct, w])

  const style = useAnimatedStyle(() => ({
    width: withTiming(`${w.value * 100}%`, { duration: 480 }),
  }))

  return (
    <View className={cn('h-1.5 overflow-hidden rounded-full bg-panel2', className)}>
      <Animated.View className="h-full rounded-full" style={[style, { backgroundColor: color }]} />
    </View>
  )
}

/** Upozornění — deload, přepal objemu, stav připomínek. */
export function Banner({
  tone = 'info',
  title,
  description,
  action,
}: {
  tone?: 'info' | 'warn' | 'over'
  title: string
  description?: string
  action?: ReactNode
}) {
  const toneColor =
    tone === 'over' ? colors.over : tone === 'warn' ? colors.warn : colors.accent

  return (
    <View
      className="flex-row items-center gap-3 rounded-lg border bg-panel p-3.5"
      style={{ borderColor: toneColor }}
    >
      <View className="h-full w-1 rounded-full" style={{ backgroundColor: toneColor }} />
      <View className="flex-1">
        <Text
          className="font-display text-[13px] uppercase tracking-[1px]"
          style={{ color: toneColor }}
        >
          {title}
        </Text>
        {description ? (
          <Text className="mt-1 text-[13px] leading-[18px] text-muted">{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}
