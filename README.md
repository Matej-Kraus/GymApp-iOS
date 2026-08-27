# Workout — iOS (React Native / Expo)

Tréninkový deník s progresivním přetížením. UI je anglicky, kód a komentáře česky.

> **Co dělat dál:** [ROADMAP.md](./ROADMAP.md) — stav, priority a známé chyby.

## Vývoj

```bash
npm install
npx expo start --web      # hlavní testovací smyčka
npm test                  # 180 testů jádra
npx tsc --noEmit          # typecheck
```

**Testuje se na webu.** Nativní funkce (HealthKit, haptika, notifikace) tam nejedou — mají bezpečné fallbacky a ověří se až na iPhonu.

Na iPhonu: potřeba dev build (`app.json` obsahuje nativní config plugin HealthKitu, takže Expo Go nestačí). Vyžaduje Apple Developer účet — viz F2 v roadmapě.

## Architektura

- `src/core/` — sdílená logika bez RN/DOM závislostí: typy, progrese (`rir.ts`), svaly a landmarky, mezocyklus, supersety, náhrady cviků, statistiky, PR, kotouče. **Tady jsou testy.**
- `src/state/asyncStore.ts` — adaptér AsyncStorage se synchronní in-memory cache
- `src/state/AppStateContext.tsx` — globální stav, hydratace při startu, debounce 300 ms na ukládání
- `src/theme/colors.ts` — barevné tokeny (zdroj pravdy; `tailwind.config.js` je jeho ruční zrcadlo)
- `src/components/` — design systém (`ui.tsx`), `LoadedBar`, `charts/AreaChart`, `Shimmer`, `VolumeBar`, `ConfirmProvider`
- `src/features/workout/` — obrazovka tréninku rozdělená na stav (`useWorkoutSession`) a části UI
- `src/lib/` — platformní věci: health, notifikace, haptika, autosave draftu, formátování
- `app/` — obrazovky (expo-router), `app/(tabs)/` je tab bar s 5 záložkami

Celý `AppData` se serializuje pod jeden klíč v AsyncStorage. Migrace řeší `MIGRATIONS` v `src/core/storage.ts`.

## Vizuál

Černo-zelená, Plus Jakarta Sans jako jediná rodina. **Pravidla, která to drží pohromadě, jsou v [ROADMAP.md](./ROADMAP.md#pravidla-která-drží-vzhled-pohromadě)** — přečti si je, než budeš přidávat UI.
