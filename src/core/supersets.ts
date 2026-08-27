/**
 * Supersety — dva a víc cviků odcvičených hned po sobě bez pauzy.
 *
 * Skupina je jen volitelný textový klíč na položce tréninku (`supersetGroup`),
 * takže se nemění tvar dat ani nepotřebuje migraci. Cviky se stejným klíčem
 * patří k sobě a odpočinek se spouští až po tom posledním z nich.
 */

/** Stačí nám z položky tréninku tohle — funguje na draftu i uloženém tréninku. */
export interface SupersetMember {
  supersetGroup?: string | null
}

/** Indexy všech cviků ve stejné skupině. Cvik bez skupiny je sám za sebe. */
export function supersetMembers(entries: SupersetMember[], index: number): number[] {
  const group = entries[index]?.supersetGroup
  if (!group) return [index]
  return entries.reduce<number[]>((out, e, i) => {
    if (e.supersetGroup === group) out.push(i)
    return out
  }, [])
}

/**
 * Je tenhle cvik poslední ve své skupině?
 *
 * Tohle rozhoduje, kdy naskočí odpočinek: uprostřed supersetu se nepauzuje,
 * jinak by to žádný superset nebyl.
 */
export function isLastInSuperset(entries: SupersetMember[], index: number): boolean {
  const members = supersetMembers(entries, index)
  return members[members.length - 1] === index
}

/** Označení pozice ve skupině, např. „A1". `null` = cvik mimo superset. */
export function supersetLabel(entries: SupersetMember[], index: number): string | null {
  const group = entries[index]?.supersetGroup
  if (!group) return null
  const members = supersetMembers(entries, index)
  return `${group}${members.indexOf(index) + 1}`
}

/** Další volný klíč skupiny (A, B, C…). */
export function nextSupersetGroup(entries: SupersetMember[]): string {
  const used = new Set(entries.map((e) => e.supersetGroup).filter(Boolean) as string[])
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!used.has(letter)) return letter
  }
  return 'A'
}
