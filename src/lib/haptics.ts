import * as Haptics from 'expo-haptics'

/**
 * Hmatová odezva — „luxury instrument" feeling. Vše v try/catch, takže na webu
 * nebo nepodporovaném zařízení appka jen tiše neudělá nic (nikdy nespadne).
 */

/** Lehké ťuknutí — přepínače, výběr, drobné akce. */
export function tapLight(): void {
  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
}

/** Střední úder — dokončení série, potvrzení. */
export function tapMedium(): void {
  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
}

/** Úspěch — dokončení tréninku. */
export function success(): void {
  try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
}

/** Varování — konec odpočinku, smazání. */
export function warning(): void {
  try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch {}
}

/** Oslava osobního rekordu — dvojitý silný puls. */
export function celebrate(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => {
      try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) } catch {}
    }, 140)
  } catch {}
}
