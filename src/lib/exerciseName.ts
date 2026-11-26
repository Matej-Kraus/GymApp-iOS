import { tr } from '@/i18n'

/**
 * Název cviku v jazyce appky. Přeložené jsou jen hlavní vestavěné cviky
 * (slovník `exerciseNames`); knihovna a vlastní cviky mají jediný název.
 */
export function exName(exercise: { id: string; name: string }): string {
  return tr().exerciseNames[exercise.id] ?? exercise.name
}

/** Totéž pro záznam v tréninku — ten si nese název textem, kdyby cvik zmizel. */
export function entryName(entry: { exerciseId: string; exerciseName: string }): string {
  return tr().exerciseNames[entry.exerciseId] ?? entry.exerciseName
}
