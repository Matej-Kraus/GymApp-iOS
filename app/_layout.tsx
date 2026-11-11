import '../global.css'
import '@/theme/webStyles'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed'
import { AppStateProvider, useAppState } from '@/state/AppStateContext'
import { ConfirmProvider } from '@/components/ConfirmProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SaveErrorBanner } from '@/components/SaveErrorBanner'
import { resolveLang } from '@/i18n'
import { colors } from '@/theme/colors'

SplashScreen.preventAutoHideAsync()

/**
 * Obrazovky. `key` = jazyk: po přepnutí jazyka se celý strom přemontuje, takže
 * se texty z `tr()` načtou znovu bez hooku v každé komponentě.
 */
function Screens() {
  const { data } = useAppState()
  return (
    <Stack
      key={resolveLang(data.settings.language)}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    />
  )
}

export default function RootLayout() {
  // Text je systémové písmo; načítá se jen zúžené display písmo na čísla a názvy.
  const [fontsLoaded] = useFonts({
    Display: BarlowCondensed_600SemiBold,
    DisplayBold: BarlowCondensed_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <ErrorBoundary>
      <AppStateProvider>
        <ConfirmProvider>
          <StatusBar style="light" />
          <Screens />
          <SaveErrorBanner />
        </ConfirmProvider>
      </AppStateProvider>
    </ErrorBoundary>
  )
}
