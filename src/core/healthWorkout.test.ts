import { healthWorkoutWindow } from './healthWorkout'

describe('healthWorkoutWindow', () => {
  const end = Date.UTC(2026, 10, 10, 18, 0, 0)

  it('start = konec minus délka', () => {
    const w = healthWorkoutWindow(60, end)
    expect(w.end.getTime()).toBe(end)
    expect(w.start.getTime()).toBe(end - 3_600_000)
  })

  it('chybějící nebo nulová délka → 1 minuta', () => {
    expect(healthWorkoutWindow(null, end).start.getTime()).toBe(end - 60_000)
    expect(healthWorkoutWindow(0, end).start.getTime()).toBe(end - 60_000)
  })
})
