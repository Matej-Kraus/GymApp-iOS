import * as Notifications from 'expo-notifications'
import type { ReminderConfig } from '@/core'
import { ensurePermission, REST_END_ID, REMINDER_PREFIX } from './notifications'

/** Připomínky tréninku přes lokální notifikace. Základ v `notifications.ts`. */

export { ensurePermission }

/** Můj den (1 = Po … 7 = Ne) → iOS weekday (1 = Ne … 7 = So). */
function toIosWeekday(d: number): number {
  return d === 7 ? 1 : d + 1
}

/**
 * Zruší naplánované připomínky — a jen je. Dřív tu bylo
 * `cancelAllScheduledNotificationsAsync`, které by zabilo i běžící pauzu.
 * Starší připomínky nemají náš prefix (náhodné id), proto „vše kromě pauzy".
 */
async function cancelReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => n.identifier !== REST_END_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

/** Zruší staré naplánované připomínky a podle configu nastaví nové. */
export async function applyReminders(cfg: ReminderConfig | undefined): Promise<boolean> {
  try {
    await cancelReminders()
    if (!cfg || !cfg.enabled || cfg.days.length === 0) return true
    const ok = await ensurePermission()
    if (!ok) return false
    for (const day of cfg.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${day}`,
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
