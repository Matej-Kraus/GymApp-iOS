import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import {
  registerDialogHost,
  type DialogOption,
  type DialogRequest,
} from '@/lib/dialogHost'
import { cn } from '@/components/ui'
import { tapLight } from '@/lib/haptics'
import { phoneWidth } from '@/theme/layout'

/**
 * Jediné místo, kde se v appce ptáme uživatele na potvrzení.
 *
 * Vlastní modal, ne obálka nad `Alert.alert` — ten na webu neexistuje a
 * `window.confirm` neumí tři tlačítka (odchod z tréninku je potřebuje).
 * Volá se přes `askConfirm` / `askChoice` z `@/lib/platform`, ne hookem,
 * aby to šlo použít i z obyčejných funkcí mimo komponenty.
 */

interface Active {
  request: DialogRequest<unknown>
  done: (value: unknown) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Active | null>(null)
  // Ref, aby zavření po odpojení nesáhlo na mrtvý stav.
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    registerDialogHost((request, done) => {
      if (!mounted.current) return
      setActive({
        request: request as DialogRequest<unknown>,
        done: done as (value: unknown) => void,
      })
    })
    return () => {
      mounted.current = false
      registerDialogHost(null)
    }
  }, [])

  const answer = useCallback((value: unknown) => {
    setActive((curr) => {
      curr?.done(value)
      return null
    })
  }, [])

  const request = active?.request
  // Zavření gestem/klávesou = totéž co ťuknout na cancel, jinak by se
  // dotaz vyřídil hodnotou, kterou uživatel nevybral.
  const cancelValue = request?.options.find((o) => o.style === 'cancel')?.value ?? null

  return (
    <>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="none"
        onRequestClose={() => answer(cancelValue)}
      >
        {request ? (
          // Pozadí i kartu drží obyčejné View, animace jsou uvnitř.
          // Uvnitř Modalu se `className` na `Animated.View` neprojeví
          // (Pressable a Text ho drží, Animated.View ne), takže barvy
          // a rozvržení musí být na komponentě, která ho respektuje.
          // absoluteFill navíc kvůli tomu, že `flex-1` tady nedostane výšku.
          <View
            style={StyleSheet.absoluteFill}
            className="justify-end bg-black/70"
          >
            {/* Ťuknutí mimo okno = zrušit. */}
            <Pressable
              accessibilityLabel="Dismiss dialog"
              className="absolute inset-0"
              onPress={() => answer(cancelValue)}
            />
            <Animated.View entering={FadeInDown.duration(200).springify().damping(20)}>
            <View
              className="m-3 mb-8 rounded-3xl bg-panel border border-line overflow-hidden"
              style={phoneWidth}
            >
              <View className="px-5 pt-5 pb-4 gap-1.5">
                <Text
                  accessibilityRole="header"
                  className="font-display text-lg text-white"
                >
                  {request.title}
                </Text>
                {request.message ? (
                  <Text className="text-sm text-muted leading-5">{request.message}</Text>
                ) : null}
              </View>
              <View className="gap-2 px-3 pb-3">
                {request.options.map((option, i) => (
                  <DialogButton
                    key={i}
                    option={option as DialogOption<unknown>}
                    onPress={() => {
                      tapLight()
                      answer(option.value)
                    }}
                  />
                ))}
              </View>
            </View>
            </Animated.View>
          </View>
        ) : null}
      </Modal>
    </>
  )
}

function DialogButton({ option, onPress }: { option: DialogOption<unknown>; onPress: () => void }) {
  const style = option.style ?? 'default'
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      className={cn(
        // 52 px — pohodlně nad 44pt minimem, i když jich je pod sebou víc.
        'h-[52px] rounded-2xl items-center justify-center',
        style === 'destructive' && 'border border-danger/40 bg-danger/10',
        (style === 'cancel' || style === 'neutral') && 'bg-panel2 border border-line',
        style === 'default' && 'bg-accent',
      )}
    >
      <Text
        className={cn(
          'font-display text-base',
          style === 'destructive' && 'text-danger',
          (style === 'cancel' || style === 'neutral') && 'text-white',
          style === 'default' && 'text-accent-text',
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  )
}
