import { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '@/theme/colors'

/** Malá knihovna znovupoužitelných UI prvků (RN verze webového ui.tsx).
 *  Vizuál: LUXURY INSTRUMENT — grafit, jemný „brushed metal" gradient,
 *  hairline okraje, bronzový akcent, tabulkové číslice u dat. */

/** Spojí podmíněně třídy (ignoruje prázdné / false hodnoty). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Tabulkové (monospace) číslice — aby data „seděla v zákrytu" jako na přístroji. */
export const tnum = { fontVariant: ['tabular-nums' as const] }

/** Jemný gradient povrch s hairline okrajem — základ pro karty a statistiky. */
function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card', className)}>
      <LinearGradient
        colors={[colors.cardTop, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* horní hairline odlesk pro dojem broušeného kovu */}
      <View style={styles.topSheen} pointerEvents="none" />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
})

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantBox: Record<Variant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-card2 border border-white/10',
  ghost: '',
  danger: 'border border-danger/40',
}
const variantText: Record<Variant, string> = {
  primary: 'text-black',
  secondary: 'text-white',
  ghost: 'text-muted',
  danger: 'text-danger',
}
const sizeBox: Record<Size, string> = {
  sm: 'h-10 px-4',
  md: 'h-12 px-5', // 48px touch target
  lg: 'h-14 px-6', // 56px hlavní CTA
}
const sizeText: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'flex-row items-center justify-center rounded-2xl active:opacity-90',
        variantBox[variant],
        sizeBox[size],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text
        className={cn('font-semibold tracking-wide', variantText[variant], sizeText[size])}
      >
        {title}
      </Text>
    </Pressable>
  )
}

/** Karta — základní plocha pro obsah (jemný kovový gradient + hairline). */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <Surface className={cn('p-4', className)}>{children}</Surface>
}

/** Hlavička obrazovky: malý nadpisek + velký titulek + volitelná akce vpravo. */
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
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-accent">{subtitle}</Text>
        ) : null}
        <Text className="mt-1 text-3xl font-display text-white">{title}</Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}

/** Prázdný stav — když ještě nejsou žádná data; navádí uživatele dál. */
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
    <View className="items-center justify-center rounded-3xl border border-dashed border-white/15 bg-card/50 px-6 py-12">
      <Text className="text-lg font-display text-white text-center">{title}</Text>
      {description ? (
        <Text className="mt-1.5 max-w-xs text-sm text-muted text-center leading-5">{description}</Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  )
}

/** Malá statistika: velké číslo + popisek (čísla jsou hrdinové). */
export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <Surface className="flex-1 px-4 py-3.5">
      <View className="flex-row items-baseline">
        <Text className="font-display text-[26px] leading-tight text-white" style={tnum}>
          {value}
        </Text>
        {unit ? <Text className="ml-1 text-sm font-medium text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</Text>
    </Surface>
  )
}
