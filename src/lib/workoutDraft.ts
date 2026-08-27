import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SetRole } from '@/core'

/**
 * Perzistence ROZDĚLANÉHO tréninku. Bez tohohle žil aktivní trénink jen v paměti
 * obrazovky → když systém appku odstřelí (hovor, přepnutí), celý trénink se ztratil.
 * Draft ukládáme zvlášť od AppData (je dočasný) pod vlastní klíč.
 */

const KEY = 'workout-draft-v1'

/** Jedna série tak, jak ji edituje obrazovka tréninku (vstupy jsou textové). */
export interface DraftSet {
  id: string
  weight: string
  reps: string
  rpe: string
  role: SetRole
  completed: boolean
  isPR: boolean
  skipped: boolean
  suggestion: { weight: number; reps: number; reason: string } | null
  lastPerf: { weight: number; reps: number } | null
}

export interface DraftEntry {
  exerciseId: string
  sets: DraftSet[]
  /** Klíč supersetu — viz `core/supersets.ts`. */
  supersetGroup?: string | null
}

export interface WorkoutDraft {
  splitId: string
  splitName: string
  /** epoch ms začátku tréninku (kvůli délce tréninku po obnovení). */
  startedAt: number
  notes: string
  entries: DraftEntry[]
  /** epoch ms posledního uložení (pro „naposledy upraveno"). */
  savedAt: number
}

export async function loadDraft(): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WorkoutDraft
    if (!parsed || !Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export async function saveDraft(draft: WorkoutDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft))
  } catch {}
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {}
}
