import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  registerDialogHost,
  type DialogOption,
  type DialogRequest,
} from '@/lib/dialogHost'
import { Button, GUTTER, Rule, Title } from '@/components/ui'
import { tapLight } from '@/lib/haptics'
import { PHONE_MAX_WIDTH } from '@/theme/layout'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

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

  const insets = useSafeAreaInsets()
  const options = (request?.options ?? []) as DialogOption<unknown>[]
  // Rovnocenné volby (seznam náhrad, nabídka cviku) jsou řádky seznamu;
  // potvrzení, smazání a zrušení jsou tlačítka pod nimi.
  const choices = options.filter((o) => o.style === 'neutral')
  // Zrušit vždy až dole, ať je potvrzení blíž textu dotazu.
  const buttons = [
    ...options.filter((o) => o.style !== 'neutral' && o.style !== 'cancel'),
    ...options.filter((o) => o.style === 'cancel'),
  ]
  const pick = (option: DialogOption<unknown>) => {
    tapLight()
    answer(option.value)
  }

  return (
    <>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="fade"
        onRequestClose={() => answer(cancelValue)}
      >
        {request ? (
          // Rozměry přes style: uvnitř Modalu `flex-1` nedostane výšku a
          // třídy na kořeni se na webu občas neprojeví.
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            {/* Ťuknutí mimo okno = zrušit. */}
            <Pressable
              accessibilityLabel={tr().common.close}
              style={StyleSheet.absoluteFill}
              onPress={() => answer(cancelValue)}
            />
            <View
              style={{
                width: '100%',
                maxWidth: PHONE_MAX_WIDTH,
                alignSelf: 'center',
                backgroundColor: colors.panel,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingHorizontal: GUTTER,
                paddingTop: 18,
                paddingBottom: Math.max(insets.bottom, 16),
              }}
            >
              <Title size="sm">{request.title}</Title>
              {request.message ? (
                <Text className="mt-1.5 text-[15px] leading-[21px] text-muted">{request.message}</Text>
              ) : null}

              {choices.length > 0 ? (
                <View className="mt-3">
                  {choices.map((option, i) => (
                    <View key={i}>
                      <Rule />
                      <Pressable
                        onPress={() => pick(option)}
                        accessibilityRole="button"
                        className="min-h-[50px] justify-center active:opacity-60"
                      >
                        <Text className="text-[17px] text-white">{option.label}</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Rule />
                </View>
              ) : null}

              <View className="mt-4" style={{ gap: 8 }}>
                {buttons.map((option, i) => (
                  <Button
                    key={i}
                    title={option.label}
                    variant={
                      option.style === 'destructive'
                        ? 'danger'
                        : option.style === 'cancel'
                          ? 'secondary'
                          : 'primary'
                    }
                    onPress={() => pick(option)}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </>
  )
}
