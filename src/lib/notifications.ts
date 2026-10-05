import * as Notifications from 'expo-notifications'

/**
 * Společný základ lokálních notifikací (připomínky tréninku, konec pauzy).
 * POZOR: plně fungují až v nativním buildu — proto vše v try/catch.
 *
 * Každý druh má vlastní identifikátor, aby si navzájem nerušily plán:
 * připomínky `reminder-<den>`, pauza jeden pevný `rest-end`.
 */

export const REST_END_ID = 'rest-end'
export const REMINDER_PREFIX = 'reminder-'

try {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      // Konec pauzy v popředí ohlásí odpočet v appce (haptika) — notifikace
      // navíc by jen zakryla obrazovku tréninku.
      const inAppRest = n.request.identifier === REST_END_ID
      return {
        shouldShowAlert: !inAppRest,
        shouldPlaySound: !inAppRest,
        shouldSetBadge: false,
        shouldShowBanner: !inAppRest,
        shouldShowList: !inAppRest,
      }
    },
  })
} catch {
  // web / Expo Go
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    if (!current.canAskAgain) return false
    const req = await Notifications.requestPermissionsAsync()
    return req.granted
  } catch {
    return false
  }
}
