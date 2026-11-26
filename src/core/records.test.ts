import { recomputeAllPRs } from './records'
import type { SetLog, WorkoutSession } from './types'

const set = (weight: number, reps: number, over: Partial<SetLog> = {}): SetLog => ({
  weight, reps, rpe: null, completed: true, role: 'working', isPR: false, ...over,
})
const session = (id: string, date: string, sets: SetLog[]): WorkoutSession => ({
  id, date, splitId: null, splitName: '', durationMinutes: null, notes: '',
  entries: [{ exerciseId: 'bench', exerciseName: 'Bench', sets }],
})
const prs = (s: WorkoutSession) => s.entries[0].sets.map((x) => x.isPR)

describe('recomputeAllPRs', () => {
  it('rekord je vždy jen zlepšení proti všemu dřívějšímu', () => {
    const out = recomputeAllPRs([
      session('a', '2026-01-01T10:00:00.000Z', [set(80, 5)]),
      session('b', '2026-01-08T10:00:00.000Z', [set(80, 5)]),
      session('c', '2026-01-15T10:00:00.000Z', [set(85, 5)]),
    ])
    expect(out.map(prs)).toEqual([[true], [false], [true]])
  })

  it('řadí podle data, ne podle pořadí v poli, a pořadí pole zachová', () => {
    const out = recomputeAllPRs([
      session('new', '2026-02-01T10:00:00.000Z', [set(90, 5)]),
      session('old', '2026-01-01T10:00:00.000Z', [set(100, 5)]),
    ])
    expect(out.map((s) => s.id)).toEqual(['new', 'old'])
    expect(out.map(prs)).toEqual([[false], [true]])
  })

  it('opraví zastaralé příznaky a ignoruje rozcvičku a nedokončené série', () => {
    const out = recomputeAllPRs([
      session('a', '2026-01-01T10:00:00.000Z', [
        set(120, 5, { role: 'warmup', isPR: true }),
        set(60, 5, { completed: false, isPR: true }),
        set(70, 5),
      ]),
    ])
    expect(prs(out[0])).toEqual([false, false, true])
  })

  it('beze změny vrací stejné reference', () => {
    const input = recomputeAllPRs([session('a', '2026-01-01T10:00:00.000Z', [set(80, 5)])])
    const again = recomputeAllPRs(input)
    expect(again).toBe(input)
  })
})
