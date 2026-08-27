import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { askChoice, askConfirm, notify } from './dialogHost'

/**
 * Vrstva nad věcmi, které se na webu a na telefonu chovají jinak.
 *
 * Testovací smyčka projektu je `expo start --web`, ale půlka nativních API
 * tam prostě není: `Alert.alert` nic neudělá, `FileSystem.cacheDirectory`
 * je `null`, `Sharing` není dostupné. Bez téhle vrstvy část appky tiše
 * nefunguje a vypadá to, že funguje — což je horší než chyba.
 *
 * Dialogy jsou vlastní (viz `dialogHost.ts` + `ConfirmProvider`), práce se
 * soubory má na webu vlastní větev přes Blob a `<input type="file">`.
 */

export { notify }
export type { DialogOption, DialogRequest, ConfirmRequest } from './dialogHost'

/** Ano/ne dotaz. Zavření okna = „ne". */
export const confirm = askConfirm

/** Dotaz s libovolným počtem tlačítek (např. tři při odchodu z tréninku). */
export const choose = askChoice

const isWeb = Platform.OS === 'web'

/**
 * Uloží JSON. Na telefonu přes systémové sdílení, na webu jako stažení.
 * Vrací krátký popis toho, co se stalo — volající ho ukáže uživateli.
 */
export async function saveJson(filename: string, json: string): Promise<string> {
  if (isWeb) {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      // Bez uvolnění drží prohlížeč celý blob v paměti do reloadu.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
    return `Downloaded ${filename}.`
  }

  const path = FileSystem.cacheDirectory + filename
  await FileSystem.writeAsStringAsync(path, json)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Training backup' })
    return 'Backup shared.'
  }
  return `Backup saved to ${path}`
}

/** Nechá uživatele vybrat JSON a vrátí jeho obsah. `null` = zrušeno. */
export async function pickJson(): Promise<string | null> {
  if (isWeb) {
    return new Promise<string | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.style.display = 'none'
      // Zrušení dialogu prohlížeč nehlásí spolehlivě napříč prohlížeči;
      // `cancel` je novější, `focus` na window je fallback pro starší.
      const finish = (value: string | null) => {
        input.remove()
        resolve(value)
      }
      input.addEventListener('cancel', () => finish(null))
      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (!file) return finish(null)
        const reader = new FileReader()
        reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null)
        reader.onerror = () => finish(null)
        reader.readAsText(file)
      })
      document.body.appendChild(input)
      input.click()
    })
  }

  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  })
  if (res.canceled || !res.assets?.[0]) return null
  return FileSystem.readAsStringAsync(res.assets[0].uri)
}

/** Sdílení textu. Na webu přes Web Share API, jinak do schránky. */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (isWeb) {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text })
        return true
      }
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  try {
    const { Share } = await import('react-native')
    await Share.share({ message: text, title })
    return true
  } catch {
    return false
  }
}
