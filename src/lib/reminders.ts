import * as Notifications from 'expo-notifications'
import type { ReminderConfig } from '@/core'

/**
 * Připomínky tréninku přes lokální notifikace.
 * POZOR: plně funguje až v nativním buildu (ne v Expo Go) — proto vše v try/catch.
 */

// Zobrazit notifikaci i když je appka v popředí.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
} catch {
  // ignore (Expo Go)
}

/** Můj den (1 = Po … 7 = Ne) → iOS weekday (1 = Ne … 7 = So). */
function toIosWeekday(d: number): number {
  return d === 7 ? 1 : d + 1
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    const req = await Notifications.requestPermissionsAsync()
    return req.granted
  } catch {
    return false
  }
}

/** Zruší staré naplánované připomínky a podle configu nastaví nové. */
export async function applyReminders(cfg: ReminderConfig | undefined): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    if (!cfg || !cfg.enabled || cfg.days.length === 0) return true
    const ok = await ensurePermission()
    if (!ok) return false
    for (const day of cfg.days) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Time to train', body: 'Today is a training day.' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: toIosWeekday(day),
          hour: cfg.hour,
          minute: 0,
          repeats: true,
        },
      })
    }
    return true
  } catch {
    return false
  }
}
