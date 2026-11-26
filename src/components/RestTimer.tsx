import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Num } from '@/components/ui'
import { colors } from '@/theme/colors'
import { tapLight, warning } from '@/lib/haptics'
import { tr } from '@/i18n'

function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Pauza mezi sériemi — odpočet ve spodní liště, ±15 s a přeskočení.
 * Běží v appce (interval + haptika na konci). `endsAt` = epoch ms konce.
 * Se zamčeným telefonem ohlásí konec lokální notifikace (`lib/restAlert.ts`).
 */
export function RestTimer({
  endsAt,
  totalSec,
  onAdjust,
  onDone,
  onSkip,
}: {
  endsAt: number
  totalSec: number
  onAdjust: (deltaSec: number) => void
  onDone: () => void
  onSkip: () => void
}) {
  const t = tr().workout
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        warning()
        onDone()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, totalSec)))

  return (
    <View>
      {/* Ubývající linka — jediná oranžová v liště, dokud pauza běží. */}
      <View style={{ height: 3, backgroundColor: colors.panel2 }}>
        <View style={{ height: 3, width: `${pct * 100}%`, backgroundColor: colors.accent }} />
      </View>
      <View className="flex-row items-center px-5 py-2" style={{ gap: 8 }}>
        <View className="flex-1 flex-row items-baseline" style={{ gap: 8 }}>
          <Num className="text-[34px] leading-[38px]">{mmss(remaining)}</Num>
          <Text className="text-[15px] text-muted">{t.rest}</Text>
        </View>
        <StepButton label="−15" a11y={t.restMinus} onPress={() => onAdjust(-15)} />
        <StepButton label="+15" a11y={t.restPlus} onPress={() => onAdjust(15)} />
        <StepButton label={t.restSkip} a11y={t.restSkip} onPress={onSkip} />
      </View>
    </View>
  )
}

function StepButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapLight()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className="h-11 items-center justify-center rounded-lg bg-panel2 px-3.5 active:opacity-60"
    >
      <Text className="text-[15px] font-medium text-white" style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </Pressable>
  )
}
