import { type ReactNode, useEffect } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors } from '@/theme/colors'
import { PHONE_MAX_WIDTH } from '@/theme/layout'
import { tr } from '@/i18n'

/** Design systém „Tréninkový deník".
 *
 *  1. Plocha, ne karty. Obsah leží přímo na pozadí a dělí ho linky; výplň
 *     dostane jen to, na co se dá sáhnout (tlačítko, pole, sheet).
 *  2. Oranžová je jen hlavní akce, postup a rekord. Vybraný stav (segment,
 *     štítek, přepínač) je křídově bílý, ne oranžový.
 *  3. Čísla sází zúžené display písmo, text systémové. Popisky jsou běžná
 *     věta — žádné verzálky s prostrkáním.
 *  4. Pohyb jen jako odpověď na dotek. Nic nenajíždí samo. */

/** Spojí podmíněně třídy (ignoruje prázdné / false hodnoty). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Tabulkové číslice — čísla nesmí poskakovat, když se mění. */
export const tnum = { fontVariant: ['tabular-nums' as const] }

/** Vodorovný okraj obrazovky (px). */
export const GUTTER = 20

// ───────────────────────── Rozvržení ─────────────────────────

/** Obrazovka: pozadí + safe area nahoře. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {children}
    </SafeAreaView>
  )
}

/** Linka mezi řádky. */
export function Rule({ className }: { className?: string }) {
  return <View className={cn('bg-line', className)} style={{ height: 1 }} />
}

/** Název obrazovky nebo bloku v display písmu. */
export function Title({
  children,
  size = 'lg',
  className,
}: {
  children: ReactNode
  size?: 'lg' | 'md' | 'sm'
  className?: string
}) {
  const box =
    size === 'lg'
      ? 'text-[44px] leading-[44px]'
      : size === 'md'
        ? 'text-[30px] leading-[32px]'
        : 'text-[24px] leading-[26px]'
  return <Text className={cn('font-display text-white', box, className)}>{children}</Text>
}

/** Číslo v display písmu s tabulkovými číslicemi. */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn('font-display text-white', className)} style={tnum}>
      {children}
    </Text>
  )
}

/** Nadpis oddílu. Běžná věta, vpravo volitelná akce. */
export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-[15px] font-semibold text-white">{children}</Text>
      {action}
    </View>
  )
}

/** Hlavička obrazovky: malé datum / kontext nad velkým názvem. */
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
        {subtitle ? <Text className="text-[15px] text-muted">{subtitle}</Text> : null}
        <Title className="mt-1">{title}</Title>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}

/** Řádek seznamu. Bez `onPress` je to jen rozvržení. */
export function Row({
  children,
  onPress,
  accessibilityLabel,
  className,
}: {
  children: ReactNode
  onPress?: () => void
  accessibilityLabel?: string
  className?: string
}) {
  const box = cn('min-h-[52px] flex-row items-center gap-3 py-3', className)
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(box, 'active:opacity-60')}
    >
      {children}
    </Pressable>
  ) : (
    <View className={box}>{children}</View>
  )
}

// ───────────────────────── Ovládání ─────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantBox: Record<Variant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-panel2',
  ghost: '',
  danger: 'bg-panel2',
}
const variantText: Record<Variant, string> = {
  primary: 'text-accent-text',
  secondary: 'text-white',
  ghost: 'text-muted',
  danger: 'text-danger',
}
const sizeBox: Record<Size, string> = {
  sm: 'h-11 px-4', // 44 pt — minimum podle Apple HIG
  md: 'h-[52px] px-5',
  lg: 'h-[58px] px-6',
}
const sizeText: Record<Size, string> = {
  sm: 'text-[15px]',
  md: 'text-[16px]',
  lg: 'text-[18px]',
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
    <View className={className}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        className={cn(
          'flex-row items-center justify-center rounded-[10px] active:opacity-70',
          variantBox[variant],
          sizeBox[size],
          disabled && 'opacity-30',
        )}
      >
        <Text className={cn('font-semibold', variantText[variant], sizeText[size])}>{title}</Text>
      </Pressable>
    </View>
  )
}

/** Tlačítko s ikonou, dotyková plocha 44 pt. */
export function IconButton({
  icon,
  onPress,
  label,
  color = colors.muted,
  size = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  /** Popisek pro VoiceOver — ikona sama nic neříká. */
  label: string
  color?: string
  size?: number
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center active:opacity-50"
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  )
}

/** Textové pole s popiskem nad ním. */
export function Field({ label, className, ...input }: TextInputProps & { label?: string }) {
  return (
    <View className={className}>
      {label ? <Text className="mb-1.5 text-[13px] text-muted">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        {...input}
        className="min-h-[48px] rounded-[10px] bg-panel2 px-3.5 py-3 text-[17px] text-white"
      />
    </View>
  )
}

/** Štítek / volba. Vybraný je křídově bílý. */
export function Chip({
  label,
  active,
  onPress,
  className,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  /** Dřív barva výplně; vybraný stav je teď vždy bílý. */
  color?: string
  className?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      className={cn(
        'h-10 justify-center rounded-full px-4 active:opacity-70',
        active ? 'bg-white' : 'bg-panel2',
        className,
      )}
    >
      <Text className={cn('text-[14px] font-medium', active ? 'text-bg' : 'text-muted')}>{label}</Text>
    </Pressable>
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
    <View className={cn('flex-row rounded-[10px] bg-panel2 p-[3px]', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn('h-10 flex-1 items-center justify-center rounded-lg', active && 'bg-white')}
          >
            <Text className={cn('text-[14px] font-semibold', active ? 'text-bg' : 'text-muted')}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Přepínač. Zapnutý je bílý s tmavým palcem. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const on = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    on.value = value ? 1 : 0
  }, [value, on])

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(on.value * 20, { duration: 140 }) }],
    backgroundColor: withTiming(on.value ? colors.bg : colors.muted, { duration: 140 }),
  }))
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on.value ? colors.text : colors.panel2, { duration: 140 }),
  }))

  // Rozměry přes style, ne třídami: `Animated.View` si `className` v tomhle
  // setupu nebere spolehlivě, takže přepínač vycházel nulový a neviditelný.
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[{ height: 28, width: 48, borderRadius: 999, justifyContent: 'center', paddingHorizontal: 3 }, track]}
      >
        <Animated.View style={[{ height: 22, width: 22, borderRadius: 999 }, knob]} />
      </Animated.View>
    </Pressable>
  )
}

// ───────────────────────── Sdělení ─────────────────────────

/** Prázdný stav — co tu bude a jak začít. */
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
    <View className="py-8">
      <Title size="md">{title}</Title>
      {description ? (
        <Text className="mt-2 text-[16px] leading-[23px] text-muted">{description}</Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  )
}

/** Upozornění. Barevný proužek vlevo říká, jak je to vážné. */
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
    <View className="flex-row items-stretch gap-3 rounded-[10px] bg-panel py-3 pr-3">
      <View style={{ width: 3, backgroundColor: toneColor, borderRadius: 2 }} />
      <View className="flex-1 justify-center">
        <Text className="text-[15px] font-semibold text-white">{title}</Text>
        {description ? (
          <Text className="mt-0.5 text-[14px] leading-[19px] text-muted">{description}</Text>
        ) : null}
      </View>
      {action ? <View className="justify-center">{action}</View> : null}
    </View>
  )
}

/** Spodní sheet: titulek, zavření, obsah. Drží se nad klávesnicí. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  scroll = false,
}: {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Obsah delší než obrazovka — zabalí se do ScrollView. */
  scroll?: boolean
}) {
  const insets = useSafeAreaInsets()
  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: GUTTER }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ paddingHorizontal: GUTTER }}>{children}</View>
  )

  // Bez tříd na kořenech: `className` uvnitř <Modal> na RN webu občas
  // nedorazí (modal se montuje mimo #root), takže rozměry jdou přes style.
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={onClose}
          accessibilityLabel={tr().common.close}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        />
        <View
          style={{
            width: '100%',
            maxWidth: PHONE_MAX_WIDTH,
            alignSelf: 'center',
            maxHeight: '90%',
            backgroundColor: colors.panel,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: GUTTER,
              paddingRight: 8,
              paddingTop: 10,
              paddingBottom: 6,
            }}
          >
            <Title size="sm" className="flex-1 pr-2">
              {title}
            </Title>
            <IconButton icon="close" label={tr().common.close} onPress={onClose} />
          </View>
          {body}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ───────────────── Starší plochy (než se přepíšou zbylé obrazovky) ─────────────────

/** Vyplněná plocha. V novém vzhledu jen pro sheety a pole; karty se ruší. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('rounded-xl bg-panel', className)}>{children}</View>
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn('p-4', className)}>{children}</Panel>
}

/** Statistika: číslo nahoře, popisek pod ním. */
export function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: ReactNode
  unit?: string
  /** Dřív animace čísla; v novém vzhledu se čísla nepočítají nahoru. */
  animate?: boolean
  decimals?: number
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-baseline">
        <Num className="text-[30px] leading-[32px]">{value}</Num>
        {unit ? <Text className="ml-1 text-[14px] text-muted">{unit}</Text> : null}
      </View>
      <Text className="mt-0.5 text-[13px] text-muted">{label}</Text>
    </View>
  )
}
