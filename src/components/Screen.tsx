import { ReactNode } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/** Standardní obal obrazovky: bezpečná zóna + tmavé pozadí. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 px-4">{children}</View>
    </SafeAreaView>
  )
}
