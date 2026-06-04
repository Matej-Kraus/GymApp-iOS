import { recommendNextSplit } from './program'
import type { Split, WorkoutSession } from './types'

const push: Split = { id: 'p1', name: 'Push', exerciseIds: [], groupId: 'ppl' }
const pull: Split = { id: 'p2', name: 'Pull', exerciseIds: [], groupId: 'ppl' }
const legs: Split = { id: 'p3', name: 'Legs', exerciseIds: [], groupId: 'ppl' }
const program = [push, pull, legs]

function sess(splitId: string, date: string): WorkoutSession {
  return { id: 'x' + date, date, splitId, splitName: '', entries: [], durationMinutes: null, notes: '' }
}

describe('recommendNextSplit', () => {
  it('bez historie → první den programu', () => {
    expect(recommendNextSplit(program, [])).toBe('p1')
  })

  it('minule Push → doporučí Pull', () => {
    expect(recommendNextSplit(program, [sess('p1', '2026-06-01')])).toBe('p2')
  })

  it('minule Legs (poslední v pořadí) → cyklicky zpět na Push', () => {
    expect(recommendNextSplit(program, [sess('p3', '2026-06-03')])).toBe('p1')
  })

  it('rozhoduje nejnovější trénink programu', () => {
    const sessions = [sess('p1', '2026-06-01'), sess('p2', '2026-06-04')]
    expect(recommendNextSplit(program, sessions)).toBe('p3')
  })

  it('ignoruje tréninky mimo program', () => {
    const sessions = [sess('p1', '2026-06-01'), sess('other', '2026-06-05')]
    expect(recommendNextSplit(program, sessions)).toBe('p2')
  })

  it('prázdný program → null', () => {
    expect(recommendNextSplit([], [sess('p1', '2026-06-01')])).toBeNull()
  })
})
