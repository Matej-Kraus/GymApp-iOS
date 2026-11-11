import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Rule, Toggle } from '@/components/ui'

/** Oddíl nastavení: nadpis a obsah pod ním. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-9">
      <Text className="mb-3 font-display text-[24px] leading-[26px] text-white">{title}</Text>
      {children}
    </View>
  )
}

/** Popisek nad ovládacím prvkem a volitelná nápověda pod ním. */
export function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-1.5 text-[15px] text-white">{label}</Text>
      {children}
      {hint ? <Text className="mt-1.5 text-[13px] leading-[18px] text-faint">{hint}</Text> : null}
    </View>
  )
}

/** Řádek s přepínačem; ťuknout jde na celý řádek. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <View>
      <Rule />
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        className="min-h-[56px] flex-row items-center py-3"
        style={{ gap: 12 }}
      >
        <View className="flex-1">
          <Text className="text-[16px] text-white">{label}</Text>
          {hint ? <Text className="mt-0.5 text-[13px] leading-[18px] text-faint">{hint}</Text> : null}
        </View>
        <Toggle value={value} onChange={onChange} />
      </Pressable>
      <Rule />
    </View>
  )
}
