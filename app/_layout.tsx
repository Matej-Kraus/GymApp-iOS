import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { AppStateProvider } from '@/state/AppStateContext'
import { ConfirmProvider } from '@/components/ConfirmProvider'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Jedna rodina napříč celou appkou. Hierarchii dělá velikost a váha,
  // ne míchání písem — tak to mají Whoop, Nike i Apple Fitness.
  const [fontsLoaded] = useFonts({
    Jakarta: PlusJakartaSans_400Regular,
    JakartaMedium: PlusJakartaSans_500Medium,
    JakartaSemiBold: PlusJakartaSans_600SemiBold,
    JakartaBold: PlusJakartaSans_700Bold,
    JakartaExtraBold: PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <AppStateProvider>
      <ConfirmProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </ConfirmProvider>
    </AppStateProvider>
  )
}
