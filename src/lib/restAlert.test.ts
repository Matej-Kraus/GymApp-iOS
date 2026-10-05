import * as Notifications from 'expo-notifications'
import { applyReminders } from './reminders'
import { cancelRestEnd, scheduleRestEnd, secondsUntil } from './restAlert'
import { REST_END_ID } from './notifications'

// Malý plánovač v paměti místo nativního modulu.
jest.mock('expo-notifications', () => {
  const scheduled = new Map<string, unknown>()
  return {
    __scheduled: scheduled,
    SchedulableTriggerInputTypes: { CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    scheduleNotificationAsync: jest.fn(async (req: { identifier?: string }) => {
      const id = req.identifier ?? `random-${scheduled.size}`
      scheduled.set(id, req)
      return id
    }),
    cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
      scheduled.delete(id)
    }),
    dismissNotificationAsync: jest.fn(async () => {}),
    getAllScheduledNotificationsAsync: jest.fn(async () =>
      [...scheduled.keys()].map((identifier) => ({ identifier })),
    ),
  }
})

const scheduled = (Notifications as unknown as { __scheduled: Map<string, any> }).__scheduled

beforeEach(() => scheduled.clear())

describe('notifikace konce pauzy', () => {
  it('sekundy do konce, aspoň 1', () => {
    expect(secondsUntil(10_000, 0)).toBe(10)
    expect(secondsUntil(10_400, 0)).toBe(11)
    expect(secondsUntil(0, 5_000)).toBe(1)
  })

  it('naplánuje s dalším cvikem a ±15 s přepíše stejnou notifikaci', async () => {
    const now = Date.now()
    await scheduleRestEnd(now + 90_000, 'Bench Press')
    await scheduleRestEnd(now + 105_000, 'Bench Press')
    expect(scheduled.size).toBe(1)
    const req = scheduled.get(REST_END_ID)
    expect(req.content.body).toBe('Next up: Bench Press')
    expect(req.trigger.seconds).toBeGreaterThanOrEqual(104)
  })

  it('Skip / konec ji zruší', async () => {
    await scheduleRestEnd(Date.now() + 60_000)
    await cancelRestEnd()
    expect(scheduled.has(REST_END_ID)).toBe(false)
  })

  it('bez povolení nic nenaplánuje', async () => {
    ;(Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: false })
    await scheduleRestEnd(Date.now() + 60_000)
    expect(scheduled.size).toBe(0)
  })
})

describe('připomínky tréninku vs. pauza', () => {
  it('změna připomínek nezruší běžící pauzu', async () => {
    await scheduleRestEnd(Date.now() + 60_000)
    await applyReminders({ enabled: true, hour: 18, days: [1, 3] })
    expect([...scheduled.keys()].sort()).toEqual(['reminder-1', 'reminder-3', REST_END_ID].sort())

    await applyReminders({ enabled: false, hour: 18, days: [] })
    expect([...scheduled.keys()]).toEqual([REST_END_ID])
  })

  it('zruší i staré připomínky s náhodným id', async () => {
    await Notifications.scheduleNotificationAsync({ content: { title: 'old' }, trigger: null })
    await applyReminders({ enabled: true, hour: 7, days: [5] })
    expect([...scheduled.keys()]).toEqual(['reminder-5'])
  })
})
