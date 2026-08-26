import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold } from '@expo-google-fonts/archivo'
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black'
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono'
import { AppStateProvider } from '@/state/AppStateContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // PLATE CODE: Archivo Black na nadpisy (verzálky), Archivo na text,
  // IBM Plex Mono na všechna čísla — váhy, opakování, objem.
  const [fontsLoaded] = useFonts({
    Archivo: Archivo_400Regular,
    ArchivoMedium: Archivo_500Medium,
    ArchivoSemiBold: Archivo_600SemiBold,
    ArchivoBlack: ArchivoBlack_400Regular,
    PlexMono: IBMPlexMono_400Regular,
    PlexMonoSemiBold: IBMPlexMono_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <AppStateProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppStateProvider>
  )
}
