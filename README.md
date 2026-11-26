# Workout — iOS (React Native / Expo)

Tréninkový deník s progresivním přetížením. UI je česky i anglicky (`src/i18n`), kód a komentáře česky.

> **Co dělat dál:** [ROADMAP.md](./ROADMAP.md) — stav, priority a známé chyby.

## Vývoj

```bash
npm install
npx expo start --web      # hlavní testovací smyčka
npm test                  # 242 testů
npx tsc --noEmit          # typecheck
```

**Testuje se na webu.** Nativní funkce (HealthKit, haptika, notifikace) tam nejedou — mají bezpečné fallbacky a ověří se až na iPhonu.

Na iPhonu: nativní build přes Xcode — postup v [ROADMAP.md](./ROADMAP.md#na-iphonu-release-build--běží-samostatně-bez-metra).

## Architektura

- `src/core/` — sdílená logika bez RN/DOM závislostí: typy, progrese (`rir.ts`), svaly a landmarky, mezocyklus, supersety, náhrady cviků, statistiky, PR, kotouče. **Tady jsou testy.**
- `src/state/asyncStore.ts` — adaptér AsyncStorage se synchronní in-memory cache
- `src/state/AppStateContext.tsx` — globální stav, hydratace při startu, debounce 300 ms na ukládání
- `src/theme/tokens.json` — barvy (jediný zdroj pravdy, čte ho `colors.ts` i `tailwind.config.js`)
- `src/components/` — design systém (`ui.tsx`), `LoadedBar`, `charts/AreaChart`, `VolumeBar`, `ConfirmProvider`, `ExercisePicker`
- `src/features/` — větší obrazovky rozdělené na části: `workout/` (stav v `useWorkoutSession`), `progress/`, `settings/`, `exercises/` (knihovna 749 cviků)
- `src/lib/` — platformní věci: health, notifikace, haptika, autosave draftu, zálohy, formátování
- `src/i18n/` — texty UI (`cs.ts`, `en.ts`), jazyk podle telefonu, přepínač v Nastavení
- `app/` — obrazovky (expo-router), `app/(tabs)/` je tab bar se 4 záložkami (Dnes, Historie, Pokrok, Plány), Nastavení je `app/settings.tsx`

Celý `AppData` se serializuje pod jeden klíč v AsyncStorage. Migrace řeší `MIGRATIONS` v `src/core/storage.ts`.

## Vizuál

Grafitová s jedinou signální oranžovou; systémové písmo na text, Barlow Condensed na velká čísla. **Pravidla, která to drží pohromadě, jsou v [ROADMAP.md](./ROADMAP.md#pravidla-která-drží-vzhled-pohromadě)** — přečti si je, než budeš přidávat UI.
