#!/usr/bin/env node
// Vyrobi pribalenou knihovnu cviku z free-exercise-db (yuhonas/free-exercise-db,
// volne dilo - Unlicense). Spusteni: node scripts/build-exercise-library.mjs [cesta-k-exercises.json]
// Bez argumentu si data stahne z GitHubu.
//
// Vystup:
//   src/core/data/exerciseLibrary.json      - kompaktni seznam (nacita se pri startu)
//   src/core/data/exerciseInstructions.json - postupy (nacitaji se az v detailu cviku)
//
// Mapovani na svalove skupiny a vybaveni appky dela az TypeScript
// (src/core/exerciseLibrary.ts), aby slo otestovat.
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
// Protahovani a kardio do silove knihovny nepatri (kardio ma vlastni zaznam aktivit).
const SKIP = new Set(['stretching', 'cardio'])

const raw = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : await (await fetch(SOURCE)).json()

const list = []
const instructions = {}
for (const x of raw) {
  if (SKIP.has(x.category) || !x.primaryMuscles?.length) continue
  list.push({
    i: x.id,
    n: x.name,
    p: x.primaryMuscles[0],
    s: x.secondaryMuscles ?? [],
    e: x.equipment ?? 'other',
    m: x.mechanic === 'isolation' ? 'i' : 'c',
  })
  if (x.instructions?.length) instructions[x.id] = x.instructions
}
list.sort((a, b) => a.n.localeCompare(b.n))

writeFileSync('src/core/data/exerciseLibrary.json', JSON.stringify(list))
writeFileSync('src/core/data/exerciseInstructions.json', JSON.stringify(instructions))
console.log(`${list.length} cviku, ${Object.keys(instructions).length} postupu`)
