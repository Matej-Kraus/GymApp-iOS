/**
 * Časové okno tréninku pro zápis do Apple Health. Čistá funkce, aby šla
 * otestovat bez HealthKitu.
 */
export function healthWorkoutWindow(
  durationMinutes: number | null,
  endMs: number,
): { start: Date; end: Date } {
  // Health odmítá nulovou délku; trénink bez změřené délky bereme jako 1 min.
  const minutes = durationMinutes && durationMinutes > 0 ? durationMinutes : 1
  return { start: new Date(endMs - minutes * 60_000), end: new Date(endMs) }
}
