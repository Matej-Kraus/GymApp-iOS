/**
 * Most mezi obyčejnými funkcemi a dialogem na obrazovce.
 *
 * Proč vůbec existuje: `Alert.alert` na webu NENÍ — volání tiše nic neudělá,
 * takže „Smazat split?" jen zdánlivě fungovalo. `window.confirm` není náhrada,
 * protože umí jen dvě tlačítka a odchod z tréninku potřebuje tři
 * (Stay / Leave and keep / Discard).
 *
 * Volající místa jsou obyčejné funkce, ne komponenty, takže se sem dialog
 * nedá dostat hookem. `ConfirmProvider` se proto zaregistruje jako host a
 * tyhle funkce jsou pak volatelné odkudkoli.
 *
 * Bez RN importů schválně — díky tomu je to testovatelné pod nodem.
 */

export type DialogStyle = 'default' | 'cancel' | 'destructive'

export interface DialogOption<T> {
  label: string
  value: T
  style?: DialogStyle
}

export interface DialogRequest<T> {
  title: string
  message?: string
  options: DialogOption<T>[]
}

/** Co musí umět ConfirmProvider: zobrazit dotaz a jednou zavolat `done`. */
export type DialogHost = <T>(request: DialogRequest<T>, done: (value: T | null) => void) => void

interface Pending {
  request: DialogRequest<unknown>
  done: (value: unknown) => void
}

let host: DialogHost | null = null
let current: Pending | null = null
const queue: Pending[] = []

/** Zavolá `ConfirmProvider` při připojení; `null` při odpojení. */
export function registerDialogHost(next: DialogHost | null): void {
  host = next
  if (host && !current) pump()
}

function pump(): void {
  if (current || queue.length === 0 || !host) return
  current = queue.shift()!
  const settled = current
  host(settled.request, (value) => {
    // Host by neměl odpovědět dvakrát, ale kdyby ano, druhá odpověď se zahodí.
    if (current !== settled) return
    current = null
    settled.done(value)
    pump()
  })
}

/**
 * Zeptá se uživatele a vrátí vybranou hodnotu, nebo `null` při zavření.
 * Dotazy se řadí do fronty — druhý počká, místo aby první přebil.
 */
export function askChoice<T>(request: DialogRequest<T>): Promise<T | null> {
  if (!host) {
    // Nemělo by nastat (provider visí v root layoutu). Radši null než
    // viset navěky na promise, která se nikdy nevyřídí.
    // `typeof` schválně: pod jestem (node) žádné __DEV__ neexistuje.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[dialogHost] Žádný dialog host — dotaz zahozen:', request.title)
    }
    return Promise.resolve(null)
  }
  return new Promise<T | null>((resolve) => {
    queue.push({
      request: request as DialogRequest<unknown>,
      done: (value) => resolve(value as T | null),
    })
    pump()
  })
}

export interface ConfirmRequest {
  title: string
  message?: string
  /** Popisek potvrzovacího tlačítka. Výchozí „OK". */
  confirmLabel?: string
  /** Popisek zrušení. Výchozí „Cancel". */
  cancelLabel?: string
  /** true = červené tlačítko (mazání). */
  destructive?: boolean
}

/** Ano/ne varianta. Zavření okna je „ne", nikdy null. */
export async function askConfirm(req: ConfirmRequest): Promise<boolean> {
  const answer = await askChoice<boolean>({
    title: req.title,
    message: req.message,
    options: [
      { label: req.cancelLabel ?? 'Cancel', value: false, style: 'cancel' },
      {
        label: req.confirmLabel ?? 'OK',
        value: true,
        style: req.destructive ? 'destructive' : 'default',
      },
    ],
  })
  return answer === true
}

/** Jen oznámení s jedním tlačítkem. */
export async function notify(title: string, message?: string): Promise<void> {
  await askChoice<true>({ title, message, options: [{ label: 'OK', value: true }] })
}

/** Jen pro testy — vyprázdní frontu mezi případy. */
export function __resetDialogQueue(): void {
  current = null
  queue.length = 0
}

declare const __DEV__: boolean
