import { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

/** Malá knihovna znovupoužitelných UI prvků (RN verze webového ui.tsx). */

/** Spojí podmíněně třídy (ignoruje prázdné / false hodnoty). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

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
  lg: 'text-lg',
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
        'flex-row items-center justify-center rounded-2xl active:opacity-80',
        variantBox[variant],
        sizeBox[size],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text className={cn('font-semibold', variantText[variant], sizeText[size])}>{title}</Text>
    </Pressable>
  )
}

/** Karta — základní plocha pro obsah. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('rounded-2xl border border-white/10 bg-card p-4', className)}>{children}</View>
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
          <Text className="text-xs font-medium uppercase tracking-wide text-muted">{subtitle}</Text>
        ) : null}
        <Text className="text-3xl font-display text-white">{title}</Text>
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
    <View className="items-center justify-center rounded-2xl border border-dashed border-white/15 bg-card/50 px-6 py-12">
      <Text className="text-lg font-semibold text-white text-center">{title}</Text>
      {description ? (
        <Text className="mt-1 max-w-xs text-sm text-muted text-center">{description}</Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  )
}

/** Malá statistika: velké číslo + popisek (čísla jsou hrdinové). */
export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-card p-3">
      <View className="flex-row items-baseline">
        <Text className="font-display text-2xl font-bold text-white">{value}</Text>
        {unit ? <Text className="ml-1 text-sm font-medium text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-1.5 text-xs text-muted">{label}</Text>
    </View>
  )
}
