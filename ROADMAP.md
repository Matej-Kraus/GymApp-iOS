# Roadmapa

Co je hotové, co se dělá dál a na co si dát pozor. Aktualizuj po každé větší dávce práce.

**Stav k 27. 8. 2026:** hotové F6 (motor progrese na RIR) a F3 (web-safe vrstva). Dialogy i záloha teď fungují i na webu, takže testovací smyčka konečně ukazuje pravdu. Další na řadě je **F4** — rozpad `app/workout.tsx`, ať je kam psát RIR/supersety.

---

## Jak to spustit

```bash
npm install
npx expo start --web      # jediný způsob, jak to teď vidět běžet (není iPhone)
npm test                  # 46 testů, jádro logiky
npx tsc --noEmit          # typecheck
```

Testovací smyčka je **web**. Nativní věci (HealthKit, haptika, notifikace) na webu nejedou a mají bezpečné fallbacky — reálně se ověří až na iPhonu.

---

## Hotovo

- [x] Sloučené větve `feat/workout-polish` + `feat/apple-health`, vše na `main`
- [x] Web běží (`react-dom`, `react-native-web`, `darkMode: 'class'`)
- [x] Celé UI v angličtině — 211 řetězců včetně 35 popisů cviků
- [x] Vizuál: černo-zelená, Plus Jakarta Sans jako jediná rodina
- [x] Vlastní `AreaChart` na `react-native-svg` (nahradil `gifted-charts`)
- [x] `LoadedBar` — naložená osa v barvách kotoučů IWF
- [x] Moti + `ShimmerText` / `SkeletonBlock` / `GlowCard`
- [x] Design systém: `Button`, `Card`, `Chip`, `Segmented`, `Toggle`, `ProgressBar`, `Banner`, `Stat`, `HeroStat`, `Row`, `SectionTitle`
- [x] **F6 · Motor progrese na RIR** — `src/core/rir.ts`, tvrdé stropy, rep-range clamp,
      mikro-deload, RIR chipy v UI (79 testů)
- [x] **F3 · Web-safe vrstva** — `src/lib/dialogHost.ts` + `ConfirmProvider` + `src/lib/platform.ts`;
      všech 9 `Alert.alert` pryč, export/import zálohy jede i na webu (87 testů)

---

## Co dál — v tomhle pořadí

> F6 a F3 jsou hotové. Jak motor rozhoduje, je v hlavičce `src/core/rir.ts`.
> Na cokoli, co se ptá uživatele nebo sahá na soubory, používej `@/lib/platform`
> (`confirm`, `choose`, `notify`, `saveJson`, `pickJson`, `shareText`) — nikdy
> `Alert.alert` ani `window.confirm`.

### F4 · Rozpad `app/workout.tsx` (513 ř.)

Dělat **před** dalšími funkcemi — RIR chipy, supersety i náhrada cviku přistanou právě sem.

```
src/features/workout/draftFactories.ts    ~60 ř.  (dnes ř. 28–52)
src/features/workout/useWorkoutSession.ts ~200 ř. (stav, autosave, dokončení)
src/features/workout/SetRow.tsx           ~90 ř.  (+ 44pt dotykové cíle)
src/features/workout/ExerciseCard.tsx     ~140 ř.
src/features/workout/WorkoutFooter.tsx    ~40 ř.
src/core/warmup.ts                        (přesun autoWarmup z ř. 214–227)
app/workout.tsx                           ~150 ř. orchestrace
```

Opravit i to, že se sety renderují **3× přes `entry.sets.map()`** s `null` filtrem místo jednoho průchodu.

---

### F5 · Svalové skupiny 6 → 13 + sekundární

Bez toho nejdou landmarky. Dnes „Arms 18 sérií" neřekne, že máš 14 na bicepsy a 4 na tricepsy.

```ts
type MuscleGroup =
  | 'Chest' | 'Back' | 'Traps'
  | 'ShouldersFront' | 'ShouldersSide' | 'ShouldersRear'
  | 'Biceps' | 'Triceps'
  | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Abs'
```

`Exercise.muscleGroup` (primární, jméno zachovat) + `secondaryMuscles?: MuscleGroup[]` (0,5 setu).

**Ověřeno:** `WorkoutEntry` drží jen `exerciseId` + `exerciseName` + `sets`, `Split` jen `exerciseIds` → **uložené tréninky ani splity migraci nepotřebují**. Migruje se pouze `customExercises[].muscleGroup`.

`storage.ts` → `DATA_VERSION = 2` + `MIGRATIONS[1]` (runner už existuje, je prázdný). `Arms` → heuristika podle názvu, `Legs` → podle názvu, neznámé → fallback, nikdy crash.

Nový `src/core/muscles.ts` nahradí **pět** duplicitních map: `SplitForm.tsx:11` · `ExercisePicker.tsx:17` · `custom-exercise.tsx:11,15` · `index.tsx:22` · `ExerciseImage.tsx:6`.

---

### F7 · Objem vs. MEV / MAV / MRV

Nový `src/core/landmarks.ts`. Výchozí týdenní série (MEV / MAV / MRV):

Chest 8/12–20/22 · Back 10/14–22/25 · Traps 4/12–20/26 · ShouldersSide 8/16–22/26 · ShouldersRear 6/12–20/26 · ShouldersFront 0/6–12/16 · Biceps 8/14–20/26 · Triceps 6/10–14/18 · Quads 8/12–18/20 · Hamstrings 6/10–16/20 · Glutes 0/4–12/16 · Calves 8/12–16/20 · Abs 0/16–20/25

Dashboard: blok „Weekly sets by muscle" (dnes jednolitě zelené pruhy) přepsat na pásma s barvami `under` / `optimal` / `warn` / `over` — tokeny už v paletě jsou.

---

### F8 · Mezocyklus + deload

**Žádná nová entita** — volitelné pole v `Settings`, takže migrace ani export netřeba:

```ts
mesocycle?: { startDate: string; lengthWeeks: number; deloadWeek: boolean }
// default { lengthWeeks: 5, deloadWeek: true } = 4 týdny akumulace + 1 deload
```

Nový `src/core/mesocycle.ts` — `currentWeek()`, `volumeTargetMultiplier()`, `deloadSignals()`.

Deload se navrhne při naplánovaném týdnu, nebo když platí 2 ze 3: ≥2 partie nad MRV dva týdny po sobě · průměrný RIR za týden ≤ 0,5 · ≥2 cviky ve stagnaci.

---

### F9 · Warm-up, supersety, náhrada cviku

- Warm-up: core hotový z F4, doplnit UI + `Settings.warmupScheme`
- Supersety: `supersetGroup?: string | null` na `WorkoutEntry` a `DraftEntry` (volitelné → bez migrace). Rest timer až po poslední sérii skupiny.
- Náhrada cviku: nový `src/core/substitutes.ts` — skóre: shodný primární sval +3, průnik sekundárních +1, shodná kategorie +1, shodné vybavení +1
- Poznámky ke cviku (výška sedačky, úchop)
- Historie přímo v tréninku: „minule 80 kg × 8 @ RIR 2" — data jsou v `lastPerformance()`, chybí jen zobrazení

---

### F2 · Expo SDK 56 + dev-client

Odloženo, protože nic neblokuje. Až bude Apple Developer účet.

- Skill `expo-upgrade`, postupně 54 → 55 → 56
- **NativeWind zůstává na 4.2.6** — v5 je pořád jen preview a SDK 56 ji nevynucuje. Největší riziko upgradu tím odpadá.
- `@expo/vector-icons` je v SDK 56 deprecated → `@react-native-vector-icons/ionicons` ve dvou souborech: `app/(tabs)/_layout.tsx:2`, `app/(tabs)/splits.tsx:5`
- `settings.tsx:4` importuje `expo-file-system/legacy` → nová API
- Vytvořit `eas.json`, doplnit `ios.bundleIdentifier`

---

## Známé chyby

### Rozbijí zážitek na iPhonu (na webu je neuvidíš)

- **`KeyboardAvoidingView` není v projektu ani jednou.** Nejhorší `PlateCalculator` — modal s inputem nahoře, klávesnice překryje celou vizualizaci. Dál `progress.tsx`, `custom-exercise.tsx`, `SplitForm.tsx`.
- **Safe area:** `workout.tsx:482` má natvrdo `pb-6` (24 px) jako odhad home indikátoru. Na Dynamic Islandu je 34, na SE 0. Použít `useSafeAreaInsets().bottom`.
- **Dotykové cíle pod 44 pt:** v `SetRow` má mazání série **20 px**, skip 28×32, ✓ 32×32. Buňky kalendáře v `history.tsx` 40 px.
- **UTC posun dat:** `toISOString().slice(0,10)` v `stats.ts:61,73` · `history.tsx:25` · `progress.tsx` · `TrainingHeatmap.tsx:41,55` · `settings.tsx:71` · `health.ts:75,98`. V ČR po půlnoci ukáže „dnešek" o den zpět. **Náhrady už existují** — `todayISO()` a `localDateISO()` v `src/lib/format.ts`, jen se ještě nepoužívají.
- **Notifikace:** `applyReminders()` tiše vrátí `false`, ale přepínač v UI zůstane zapnutý → uživatel si myslí, že připomínka běží.
- **UTC posun** je pořád všude kromě `settings.tsx` (export už používá `todayISO()`).
- `src/components/Screen.tsx` je **mrtvý kód** (0 importů) — každá obrazovka si `SafeAreaView` píše sama. Buď oživit jako jediné místo pro safe area, nebo smazat.

### Drobnosti

- `README.md` tvrdí, že je hotová jen „Fáze 1", a zmiňuje neexistující limetkový akcent `#C6FF00`
- `AGENTS.md` posílá na docs SDK 56, projekt běží na 54
- Šipka `›` na kartě splitu není klikatelná (`splits.tsx` — řádek nemá `onPress`)
- `AreaChart` nemá decimaci bodů — 365 záznamů váhy slepí osu X
- Dashboard ukáže „Pick a session" místo doporučení, když `activeProgramId` není nastavené
- `Onboarding.tsx` používá emoji 🎯 📊 🔒 jako ikony — porušuje pravidlo 5 níž

---

## Pravidla, která drží vzhled pohromadě

Než něco přidáš do UI, přečti si tohle — jinak se to rozpadne:

1. **Zelená `#00E676` je jen pro postup a hlavní akce.** Nic dekorativního ji nesmí použít, jinak přestane něco znamenat. Všechno ostatní je šedá škála (`text` / `muted` / `faint`).
2. **Výjimka jsou barvy kotoučů** na `LoadedBar` — tam sytá barva nese skutečnou informaci (červená = 25 kg). Nikde jinde.
3. **Čísla velká, popisky malé.** Velikost říká, co je důležité.
4. **Jedna rodina písma** (Plus Jakarta Sans). Hierarchii dělá váha a velikost, ne míchání písem.
5. **Žádná emoji jako ikony** — jen Ionicons.
6. Zdroj pravdy pro barvy je `src/theme/colors.ts`; `tailwind.config.js` je jeho ruční zrcadlo — **měň obojí**.
7. **Uvnitř `<Modal>` nedávej `className` na `Animated.View`** — neprojeví se (na `Pressable`
   a `Text` ano). Barvy a rozvržení dej na obyčejný `View`, animaci nech uvnitř. A `flex-1`
   tam nedostane výšku, takže na plochu přes celou obrazovku použij `StyleSheet.absoluteFill`.
   Stálo to hodinu při F3, viz `ConfirmProvider.tsx`.

## Odkud vzešel návrh

Vizuál vychází z toho, co dělají současné fitness appky, ne z „co vypadá draze":
- [Rozbor Whoop UI](https://www.925studios.co/blog/whoop-design-breakdown)
- [Dark-mode fitness dashboardy 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026)

Graf `AreaChart` přebírá návrh z [Bklitu](https://bklit.com/) (gradient slábnoucí k nule, mřížka `4,4`, čárkovaný ocas, clip-reveal 1100 ms) — Bklit sám je DOM-only, takže je to postavené na `react-native-svg`.

Animace stojí na [Moti](https://moti.fyi/), což je RN port API [Motion](https://motion.dev/). `ShimmerText` je RN překlad shimmer-textu z [Kokonut UI](https://kokonutui.com/) — web verze animuje `backgroundPosition`, tady to dělá `MaskedView` s jezdícím gradientem.
