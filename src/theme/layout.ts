/**
 * Rozměry, které nejsou barvy.
 *
 * Celé UI je navržené na telefon. Na webu (jediná testovací smyčka projektu)
 * by se ale přes celou obrazovku roztáhly řádky sérií přes metr a nedalo by
 * se to číst ani ověřovat. Proto se obsah drží v šířce telefonu a zbytek
 * plochy je jen tmavé pozadí.
 */

/** Maximální šířka obsahu na webu (px). Zhruba velký telefon. */
export const PHONE_MAX_WIDTH = 480

/**
 * Drží obsah modalu v šířce telefonu.
 *
 * Modaly se na webu montují mimo `#root`, takže je omezení z `global.css`
 * nechytí a musí si o šířku říct samy. Na telefonu je obrazovka užší než
 * `PHONE_MAX_WIDTH`, takže to nic nedělá.
 */
export const phoneWidth = {
  width: '100%',
  maxWidth: PHONE_MAX_WIDTH,
  alignSelf: 'center',
} as const
