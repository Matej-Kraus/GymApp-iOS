# Roadmapa

Co je hotové, co se dělá dál a na co si dát pozor. Aktualizuj po každé větší dávce práce.

**Stav k 26. 11. 2026:** hotové F3–F9, F11 a F12 a první tři body z F13. Redesign
(11. 11.) je na `main`. Všechno od října je ale ověřené jen na webu. Na řadě je
**F10 — ověřit všechno na reálném iPhonu**, pak zbytek F13 (Sentry, widget, Watch).

---

## Jak to spustit

### Na iPhonu (Release build — běží samostatně, bez Metra)

```bash
npx expo prebuild --platform ios --clean   # jen po změně app.json / nativních balíčků
cd ios && pod install                        # potřebuje síť (stahuje Hermes)
npm run ios:device    # = scripts/ios-device.sh: build + instalace na připojený iPhone

# ručně:
xcodebuild -workspace Workout.xcworkspace -scheme Workout -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build/dd \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=5WVQ93537F build
xcrun devicectl device install app --device <UDID> build/dd/Build/Products/Release-iphoneos/Workout.app
```

- **Free účet = podpis platí 7 dní.** Pak appka nejde otevřít a musí se znovu nainstalovat
  (data zůstanou). Placený účet (99 USD/rok) → TestFlight a podpis na rok.
- Na iPhonu musí být zapnutý **Developer Mode** a při prvním spuštění důvěřovat vývojáři
  (Nastavení → Obecné → Správa VPN a zařízení).
- **Nemaž `ios/build/generated`** — je tam codegen z `pod install`; bez něj build padá
  na „Build input file cannot be found … States.cpp". Spraví to `pod install`.
- První build trvá ~15–20 min a chce ~10 GB volného místa.

### Vývoj

```bash
npm install
npx expo start --web      # hlavní testovací smyčka
npm test                  # 242 testů, jádro logiky
npx tsc --noEmit          # typecheck
```

Testovací smyčka je **web**. Nativní věci (HealthKit, haptika, notifikace) na webu nejedou a mají bezpečné fallbacky — reálně se ověří až na iPhonu.

### Git

Remote je přes HTTPS a obyčejný `git push` nemá přihlášení. Funguje přes `gh`:
`git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`.
**Repo je veřejné** — před pushem zkontroluj, že v diffu nejsou klíče ani tokeny.

---

## Hotovo

- [x] Sloučené větve `feat/workout-polish` + `feat/apple-health`, vše na `main`
- [x] Web běží (`react-dom`, `react-native-web`, `darkMode: 'class'`)
- [x] Vlastní `AreaChart` na `react-native-svg` (nahradil `gifted-charts`)
- [x] `LoadedBar` — naložená osa v barvách kotoučů IWF
- [x] **F6 · Motor progrese na RIR** — `src/core/rir.ts`, tvrdé stropy, rep-range clamp,
      mikro-deload, RIR chipy v UI (79 testů)
- [x] **F3 · Web-safe vrstva** — `src/lib/dialogHost.ts` + `ConfirmProvider` + `src/lib/platform.ts`;
      všech 9 `Alert.alert` pryč, export/import zálohy jede i na webu (87 testů)
- [x] **F4 · Rozpad `app/workout.tsx`** — 581 → 127 řádků, `src/features/workout/*`,
      `src/core/warmup.ts`, dotykové cíle na 44pt, safe area místo natvrdo `pb-6` (93 testů)
- [x] **F5 · Svalové skupiny 6 → 13** — `src/core/muscles.ts` nahradil pět duplicitních map,
      `secondaryMuscles` za půl série, `DATA_VERSION = 2` s migrací vlastních cviků (116 testů)
- [x] **F7 · Objem vs. MEV/MAV/MRV** — `src/core/landmarks.ts`, `VolumeBar` s pásmy
      under/optimal/warn/over místo jednolitě zelených pruhů (130 testů)
- [x] **F8 · Mezocyklus + deload** — `src/core/mesocycle.ts`, volitelné pole v `Settings`
      (žádná migrace), deload banner na dashboardu, 2 ze 3 signálů (149 testů)
- [x] **F9 · Warm-up, supersety, náhrada cviku** — `src/core/supersets.ts` +
      `substitutes.ts`, schémata rozcvičky, trvalé poznámky ke cvikům (172 testů)
- [x] **Redesign „Tréninkový deník"** (11. 11. 2026, 242 testů) — nahradil černo-zelený
      vzhled s Plus Jakarta Sans, Moti, shimmerem a gradienty:
      - grafitová paleta s jedinou signální oranžovou, barvy v `src/theme/tokens.json`
      - systémové písmo na text + Barlow Condensed na velká čísla a názvy
      - 4 záložky (Dnes, Historie, Pokrok, Plány), Nastavení jako samostatná obrazovka
        (`app/settings.tsx`, části v `src/features/settings/*`)
      - Historie: kalendář podle místního dne, úprava a zpětné doplnění tréninku
        (`app/session-edit.tsx`), přepočet rekordů v celé historii (`recomputeAllPRs`)
      - knihovna 749 cviků z [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
        (`src/core/data/exerciseLibrary.json`, generuje `scripts/build-exercise-library.mjs`),
        hledání bez diakritiky, detail cviku s obrázkem, české názvy hlavních cviků
      - vlastní cviky jdou upravit a smazat
      - Pokrok rozdělený do `src/features/progress/*`, graf bez výplně a náběhu
      - celé UI přes i18n (`src/i18n/cs.ts` + `en.ts`), jazyk podle telefonu,
        přepínač v Nastavení

---

## Co dál — v tomhle pořadí

> Úkoly jsou i jako [GitHub issues s labelem `roadmap`](../../issues?q=label%3Aroadmap). Hotové odškrtni na obou místech.

> Jak motor progrese rozhoduje, je v hlavičce `src/core/rir.ts`.
> Na cokoli, co se ptá uživatele nebo sahá na soubory, používej `@/lib/platform`
> (`confirm`, `choose`, `notify`, `saveJson`, `pickJson`, `shareText`) — nikdy
> `Alert.alert` ani `window.confirm`. Obrazovka tréninku je rozdělená:
> stav v `useWorkoutSession`, vzhled v `features/workout/*` — nová funkce
> patří tam, ne do `app/workout.tsx`.

### F10 · Ověřit na iPhonu ← TEĎ · [#1](../../issues/1)

Všechno níž je na webu ověřené jen přes fallbacky. Redesign na telefonu ještě nikdy
nebyl. Projít na telefonu:

- [ ] Onboarding, vytvoření splitu, celý trénink od startu po souhrn
- [ ] Autosave draftu — zabít appku uprostřed tréninku a otevřít znovu
- [ ] Rest timer, haptika, kalkulačka kotoučů s klávesnicí
- [ ] Konec pauzy jako notifikace se zamčeným telefonem
- [ ] HealthKit — dialog oprávnění, váha, složení těla, Watch tréninky v Pokroku
- [ ] Zápis dokončeného tréninku do Health (Health → Procházet → Tréninky)
- [ ] Notifikace — připomínka tréninku přijde i se zavřenou appkou
- [ ] Zálohy (F11): snapshoty v Soubory → Na mém iPhonu → Workout, share sheet →
      iCloud Drive, obnova ze souboru na čisté instalaci
- [ ] Redesign: Barlow Condensed se načte (ne systémový fallback), čeština
      i angličtina se vejdou, kalendář a úprava tréninku v Historii
- [ ] Knihovna cviků: obrázky se stahují z GitHubu — jak to vypadá bez internetu
- [ ] Historie cviku z tréninku, kalkulačky v Nastavení
- [ ] Safe area (Dynamic Island), dotykové cíle, scroll, klávesnice na všech formulářích
- [ ] Ikona a splash na ploše
- [ ] Výkon: historie s rokem dat (vzorová data), knihovna 749 cviků, grafy

Nalezené chyby zapisovat do „Známé chyby".

### F11 · Data nesmí zmizet · [#2](../../issues/2)

Hotovo 5. 10. 2026, zbývá ověřit na iPhonu (je to v seznamu F10). Logika
`src/core/backup.ts` (testy), soubory `src/lib/backups.ts` + `snapshotFolder`
v `@/lib/platform`, UI `src/features/settings/BackupSection.tsx` a banner na dashboardu.

- [x] Automatické snapshoty v telefonu — po změně tréninků (5 s debounce) a týdně
      při jiné změně; 10 automatických + 5 pojistných, starší se mažou
- [x] Pojistný snapshot před obnovou a před „Smazat všechna data"
- [x] Obnova ze snapshotu v Nastavení (s potvrzením)
- [x] Připomínka kopie mimo telefon (≥ 3 tréninky a 14 dní / nikdy) v Nastavení
      i na dashboardu, „Později" ji odloží o 3 dny
- [x] `Documents/Backups` vidět v Soubory (`UIFileSharingEnabled`)
- [x] Varování při selhání zápisu (`SaveErrorBanner`) a `ErrorBoundary`
- [ ] **Automaticky do iCloud Drive** — free účet nemá iCloud entitlement. Až s placeným
      účtem (iCloud Documents container), do té doby ručně přes share sheet.

Pozor: `lastExportAt` se nastaví po zavření share sheetu — `expo-sharing` neřekne,
jestli uživatel soubor opravdu uložil.

### F12 · Apple Health naplno — hotovo · [#3](../../issues/3), [#4](../../issues/4)

- [x] **Zápis tréninků do Health** (10. 11. 2026) — `saveWorkout` v `src/lib/health.ts`,
      přepínač v Nastavení → Apple Health. Ověřit na iPhonu (je to v seznamu F10).
- [x] **Watch tréninky do historie NE** (rozhodnuto 10. 11. 2026) — zůstávají jen v Pokroku.
      Prázdné sessions bez cviků by zkreslily streak, objem a landmarky. Stará verze
      importu je na větvi `archive/lokalni-verze-2026-08` (`src/lib/healthImport.ts`).

### F13 · Funkce na „plnohodnotnou" appku · [#5](../../issues/5), [#6](../../issues/6), [#7](../../issues/7)

Seřazené podle poměru přínos / práce:

1. [x] **Konec pauzy jako notifikace** (5. 10. 2026) — `src/lib/restAlert.ts`, pevné id
       `rest-end`, ±15 s přeplánuje, Skip/odchod zruší, v popředí se nezobrazí.
       Připomínky už neruší všechno (`cancelAllScheduled…` → jen své).
       Live Activity až s placeným účtem.
2. [x] **Historie cviku** (10. 11. 2026) — ťuknout na název cviku → poslední 3 tréninky + PR.
       `src/core/exerciseHistory.ts`, `features/workout/ExerciseHistorySheet.tsx`.
       - [ ] Volitelně: mini graf e1RM přímo v sheetu (teď je trend jen v Pokroku,
             `features/progress/ExerciseTrend.tsx`)
3. [x] **Plate/1RM kalkulačka mimo trénink** (10. 11. 2026) — `features/settings/ToolsSection.tsx`.
4. [ ] Crash reporting (Sentry — `.sentryclirc` už existuje, SDK v projektu není).
       Nejmenší ze zbylých bodů.
5. [ ] **Widget** s dalším tréninkem a streakem (vyžaduje nativní target)
6. [ ] **Apple Watch appka** — logování sérií z hodinek (velké, až po F2)

### F2 · Expo SDK 56 + dev-client

Odloženo, protože nic neblokuje — nativní build jede na SDK 54.

- [x] `eas.json`, `ios.bundleIdentifier`, `appleTeamId` v `app.json` (2. 10. 2026)
- [x] Plugin `plugins/withoutPushEntitlement.js` — free účet nesmí mít push entitlement
      (lokální notifikace fungují i bez něj)
- [x] Chyběl peer `react-native-nitro-modules` (vyžaduje ho HealthKit v14) —
      bez něj padal `pod install`

- Skill `expo-upgrade`, postupně 54 → 55 → 56
- **NativeWind zůstává na 4.2.6** — v5 je pořád jen preview a SDK 56 ji nevynucuje. Největší riziko upgradu tím odpadá.
- `@expo/vector-icons` je v SDK 56 deprecated → `@react-native-vector-icons/ionicons`. Teď ve **12** souborech.
- `expo-file-system/legacy` → nové API. Import je jen v `src/lib/platform.ts:2`, takže je to jedno místo.

---

## Známé chyby

Zbylo jen to, co nejde ověřit bez iPhonu, nebo co čeká na F2.

- **Nativní chování celkově.** HealthKit, haptika a notifikace mají na webu
  fallbacky, takže testovací smyčka o nich neřekne nic. Klávesnice, safe area
  a dotykové cíle jsou ošetřené, ale ověřené jen v prohlížeči.
- **Obrázky cviků jsou z internetu** (`LIBRARY_IMAGE_BASE` v `src/core/exerciseLibrary.ts`,
  raw GitHub free-exercise-db). Bez internetu se nemusí zobrazit — detail cviku má
  fallback, ale appka si je sama neukládá.
- **`@expo/vector-icons` je v SDK 56 deprecated** → `@react-native-vector-icons/ionicons`.
  Teď se používá ve 12 souborech, viz F2.
- Úklid: v `tailwind.config.js` zůstaly aliasy písma z doby Plus Jakarta Sans
  (`sans-medium`, `sans-semibold`, `mono`, `mono-semibold`). Nic je už nepoužívá,
  dají se smazat.

### Opraveno 27. 8. 2026

- UTC posun dat (osm výskytů) → `src/core/dates.ts`, jest běží v `Europe/Prague`
- Chybějící `KeyboardAvoidingView` → `PlateCalculator` + tři obrazovky
- Dotykové cíle pod 44 pt v `SetRow` i v kalendáři `history.tsx`
- Natvrdo `pb-6` místo safe area ve spodní liště tréninku
- Tichý přepínač notifikací — teď se vypne a řekne proč
- Neklikatelná šipka na kartě splitu (teď spouští trénink)
- `AreaChart` bez decimace — rok denních vážení slepil osu X
- Dashboard hlásil „Pick a session", i když splity byly (jen chyběl aktivní program)
- Emoji jako ikony (porušovalo pravidlo 5) → Ionicons
- Syrové klíče skupin v UI („ShouldersFront" místo „Front delts")
- Mrtvý `src/components/Screen.tsx` smazán
- Rozbitý `Toggle` v design systému
- `README.md` a `AGENTS.md` tvrdily neplatné věci (SDK 56, „Fáze 1", 46 testů)

## Pravidla, která drží vzhled pohromadě

Než něco přidáš do UI, přečti si tohle — jinak se to rozpadne:

1. **Oranžová `accent` (`#FF6B1A`) je jen pro hlavní akci, postup a rekordy.** Nic
   dekorativního ji nesmí použít, jinak přestane něco znamenat. Všechno ostatní je
   grafitová škála (`text` / `muted` / `faint` na `bg` / `panel` / `panel2`).
2. **Výjimka jsou barvy kotoučů** na `LoadedBar` a **pásma objemu** na `VolumeBar`
   (`optimal` / `warn` / `over` / `under`) — tam barva nese skutečnou informaci
   (červená = 25 kg). Nikde jinde.
3. **Čísla velká, popisky malé.** Velikost říká, co je důležité.
4. **Dvě role písma, nic dalšího.** Text je systémové písmo (`font-sans`, na iPhonu SF),
   velká čísla a názvy jsou Barlow Condensed (`font-display`, `font-display-bold`).
   Hierarchii dělá váha a velikost, ne další rodiny.
5. **Žádná emoji jako ikony** — jen Ionicons.
6. **Zdroj pravdy pro barvy je `src/theme/tokens.json`.** Čte ho `colors.ts` i
   `tailwind.config.js`, takže se mění na jednom místě. Výjimka: barvy kotoučů jsou
   v `PLATE_COLORS` (`colors.ts`) a ručně zrcadlené v `tailwind.config.js` — tam měň obojí.
7. **Žádný text natvrdo v UI.** Všechno jde přes `src/i18n` a nový klíč patří do
   `cs.ts` i `en.ts` zároveň. Čeština bývá delší — zkontroluj, že se vejde.
8. **Uvnitř `<Modal>` nedávej `className` na `Animated.View`** — neprojeví se (na `Pressable`
   a `Text` ano). Barvy a rozvržení dej na obyčejný `View`, animaci nech uvnitř. A `flex-1`
   tam nedostane výšku, takže na plochu přes celou obrazovku použij `StyleSheet.absoluteFill`.
   Stálo to hodinu při F3, viz `ConfirmProvider.tsx`.
9. **Web se drží v šířce telefonu** (`web.css` → `#root`, 480 px). Pravidla musí být ve
   `web.css`, ne v `global.css` — ten NativeWind parsuje i pro iOS a release bundle na nich
   padá. Modaly se montují mimo `#root`, takže si šířku berou samy z `phoneWidth`
   v `src/theme/layout.ts` — nový modal na to nezapomeň. Obalit `<Stack>` do View
   **nefunguje**: rozbije to Reanimated `entering` a obsah zůstane neviditelný.
10. **Když prvek zmizí nebo nemá barvu, podezřívej NativeWind třídu, ne logiku.**
    Nepropsaly se `h-2.5`, `w-0.5` ani `bg-white/[0.13]` — bez chyby, prostě nic.
    Na malé rozměry a průhlednosti používej `style`, viz `VolumeBar.tsx`.

## Odkud vzešel návrh

Redesign z 11. 11. 2026 jde po „tréninkovém deníku": grafitová guma posilovny, křídový
text a jedna signální oranžová. Zúžené Barlow Condensed odkazuje na čísla na kotoučích.
Předtím byl vzhled černo-zelený s animacemi (Moti, shimmer) a gradienty — redesign je
odstranil.

Graf `AreaChart` vychází z návrhu [Bklitu](https://bklit.com/) (mřížka `4,4`, čárkovaný
ocas), postavený na `react-native-svg`. Od redesignu je bez výplně a bez náběhové
animace; tažením prstu ukáže hodnotu bodu.
