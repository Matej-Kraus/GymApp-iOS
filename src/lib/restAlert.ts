import * as Notifications from 'expo-notifications'
import { ensurePermission, REST_END_ID } from './notifications'

/**
 * Konec pauzy jako lokální notifikace — aby přišla i se zamčeným telefonem
 * nebo s appkou na pozadí. Pevný identifikátor: nové naplánování (±15 s)
 * starou notifikaci nahradí. Free účet stačí, push entitlement netřeba.
 */

/** Za kolik sekund od teď (iOS chce aspoň 1). */
export function secondsUntil(endsAt: number, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((endsAt - now) / 1000))
}

export async function scheduleRestEnd(endsAt: number, nextLabel?: string): Promise<void> {
  try {
    // O povolení se ptáme až tady — u první pauzy je jasné, k čemu je.
    if (!(await ensurePermission())) return
    await Notifications.scheduleNotificationAsync({
      identifier: REST_END_ID,
      content: {
        title: 'Rest is over',
        body: nextLabel ? `Next up: ${nextLabel}` : 'Time for your next set.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil(endsAt),
        repeats: false,
      },
    })
  } catch {
    // web / bez povolení — odpočet v appce funguje dál
  }
}

export async function cancelRestEnd(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_END_ID)
    await Notifications.dismissNotificationAsync(REST_END_ID)
  } catch {
    // nic naplánováno / web
  }
}
