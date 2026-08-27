import { ReactNode, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/theme/colors'

/** Design systém.
 *
 *  Pravidla, která drží vzhled pohromadě:
 *  1. Zelená je jen pro postup a hlavní akce. Nic dekorativního.
 *  2. Čísla jsou velká, popisky malé. Velikost říká, co je důležité.
 *  3. Jedna rodina písma, hierarchii dělá váha a velikost.
 *  4. Velkorysé mezery — radši míň prvků s víc prostorem. */

/** Spojí podmíněně třídy (ignoruje prázdné / false hodnoty). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Tabulkové číslice — čísla nesmí poskakovat, když se mění. */
export const tnum = { fontVariant: ['tabular-nums' as const] }

/** Odpočítá číslo nahoru při změně. */
export function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const start = Date.now()

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
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

/** Povrch karty. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('rounded-3xl border border-line bg-panel', className)}>{children}</View>
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantBox: Record<Variant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-panel2 border border-line',
  ghost: '',
  danger: 'border border-danger/40 bg-danger/10',
}
const variantText: Record<Variant, string> = {
  // Na syté zelené čte tmavý text líp než bílý.
  primary: 'text-accent-text',
  secondary: 'text-white',
  ghost: 'text-muted',
  danger: 'text-danger',
}
const sizeBox: Record<Size, string> = {
  sm: 'h-11 px-4', // 44pt — minimum podle Apple HIG
  md: 'h-[52px] px-6',
  lg: 'h-[58px] px-7',
}
const sizeText: Record<Size, string> = {
  sm: 'text-[13px]',
  md: 'text-[15px]',
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
    transform: [{ scale: withSpring(1 - pressed.value * 0.025, { damping: 20, stiffness: 340 }) }],
    opacity: withTiming(1 - pressed.value * 0.12, { duration: 90 }),
  }))

  return (
    <Animated.View style={style} className={className}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        className={cn(
          'flex-row items-center justify-center rounded-2xl',
          variantBox[variant],
          sizeBox[size],
          disabled && 'opacity-30',
        )}
      >
        <Text
          className={cn('font-sans-semibold tracking-[0.2px]', variantText[variant], sizeText[size])}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

/** Karta — základní plocha pro obsah. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn('p-5', className)}>{children}</Panel>
}

/** Hlavička obrazovky. Titulek velký, nadpisek drobný. */
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
          <Text className="font-sans-medium text-[11px] uppercase tracking-[1.6px] text-faint">
            {subtitle}
          </Text>
        ) : null}
        <Text className="mt-1.5 font-display text-[32px] leading-[36px] tracking-[-0.8px] text-white">
          {title}
        </Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}

/** Popisek sekce. */
export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.4px] text-faint">
        {children}
      </Text>
      {action}
    </View>
  )
}

/** Prázdný stav — pozvánka k akci. */
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
    <View className="items-center justify-center rounded-3xl border border-dashed border-line px-6 py-14">
      <Text className="text-center font-display text-lg tracking-[-0.3px] text-white">{title}</Text>
      {description ? (
        <Text className="mt-2 max-w-xs text-center text-sm leading-[20px] text-muted">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  )
}

/** Statistika. Číslo je hrdina, popisek slouží. */
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
  animate?: boolean
  decimals?: number
}) {
  const numeric = typeof value === 'number' ? value : 0
  const counted = useCountUp(numeric)
  const shown = animate && typeof value === 'number' ? counted.toFixed(decimals) : value

  return (
    <Panel className="flex-1 px-4 py-4">
      <View className="flex-row items-baseline">
        <Text className="font-display text-[26px] leading-[30px] tracking-[-0.6px] text-white" style={tnum}>
          {shown}
        </Text>
        {unit ? <Text className="ml-1 font-sans-medium text-xs text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-2 font-sans-medium text-[11px] tracking-[0.2px] text-faint">{label}</Text>
    </Panel>
  )
}

/** Přerostlé číslo pro klíčovou metriku — to, co má být čitelné na délku paže. */
export function HeroStat({
  value,
  unit,
  label,
  color = colors.text,
}: {
  value: string | number
  unit?: string
  label?: string
  color?: string
}) {
  return (
    <View className="items-center">
      <View className="flex-row items-baseline">
        <Text
          className="font-display text-[56px] leading-[60px] tracking-[-2px]"
          style={[tnum, { color }]}
        >
          {value}
        </Text>
        {unit ? (
          <Text className="ml-1.5 font-sans-medium text-base text-muted">{unit}</Text>
        ) : null}
      </View>
      {label ? (
        <Text className="mt-1 font-sans-medium text-[11px] uppercase tracking-[1.4px] text-faint">
          {label}
        </Text>
      ) : null}
    </View>
  )
}

/** Chip / pill — filtr, volba, štítek. */
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
  color?: string
  className?: string
}) {
  const pressed = useSharedValue(0)
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.04, { damping: 20, stiffness: 360 }) }],
  }))

  return (
    <Animated.View style={style} className={className}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
        className={cn(
          'h-10 justify-center rounded-full border px-4',
          active ? 'border-accent bg-accent' : 'border-line bg-panel',
        )}
      >
        <Text
          className={cn(
            'font-sans-semibold text-[13px]',
            active ? 'text-accent-text' : 'text-muted',
          )}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

/** Segmentovaný přepínač. */
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
    <View className={cn('flex-row rounded-2xl border border-line bg-panel p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-xl',
              active && 'bg-accent',
            )}
          >
            <Text
              className={cn(
                'font-sans-semibold text-[13px]',
                active ? 'text-accent-text' : 'text-muted',
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

/** Přepínač s plynulým přejezdem palce. */
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

  // Rozměry přes style, ne třídami: `Animated.View` si `className` v tomhle
  // setupu nebere spolehlivě (a `px-0.5` se nepropíše vůbec), takže přepínač
  // vycházel nulový a byl neviditelný. Proto si settings dlouho kreslily
  // vlastní přepínač místo téhle komponenty.
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={10} accessibilityRole="switch">
      <Animated.View
        style={[
          { height: 28, width: 48, borderRadius: 999, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 2 },
          track,
        ]}
      >
        <Animated.View
          style={[{ height: 22, width: 22, borderRadius: 999, backgroundColor: '#FFFFFF' }, knob]}
        />
      </Animated.View>
    </Pressable>
  )
}

/** Ukazatel postupu. */
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
    width: withTiming(`${w.value * 100}%`, { duration: 520 }),
  }))

  return (
    <View className={cn('h-2 overflow-hidden rounded-full bg-panel2', className)}>
      <Animated.View className="h-full rounded-full" style={[style, { backgroundColor: color }]} />
    </View>
  )
}

/** Upozornění. */
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
  const toneColor = tone === 'over' ? colors.over : tone === 'warn' ? colors.warn : colors.accent

  return (
    <View
      className="flex-row items-center gap-3.5 rounded-2xl border bg-panel p-4"
      style={{ borderColor: `${toneColor}55` }}
    >
      <View className="h-9 w-1 rounded-full" style={{ backgroundColor: toneColor }} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm" style={{ color: toneColor }}>
          {title}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

/** Řádek v seznamu nastavení / voleb. */
export function Row({
  label,
  hint,
  right,
  onPress,
}: {
  label: string
  hint?: string
  right?: ReactNode
  onPress?: () => void
}) {
  const content = (
    <View className="min-h-[56px] flex-row items-center justify-between gap-4 px-5 py-3.5">
      <View className="flex-1">
        <Text className="font-sans-medium text-[15px] text-white">{label}</Text>
        {hint ? <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{hint}</Text> : null}
      </View>
      {right}
    </View>
  )
  return onPress ? (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  ) : (
    content
  )
}
