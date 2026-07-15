# Stánek S4244 — IAAPA Expo Europe 2026

Branding výstavního stánku pro **HTDM**. ExCeL London, září 2026.
Rohový shell scheme **GES AMP**, dvě bílé stěny 2,5 m, LED podlaha jako hlavní vizuál.

## Rychlý start

Nic se nebuildí. Otevři v prohlížeči:

| Soubor | Co to je |
|---|---|
| `web/viewer.html` | **3D editor** — nahraj grafiku, uvidíš, kde ji spáry panelů rozdělí |
| `web/index.html` | **Datová stránka** — všechny technické parametry, regulace, termíny |

Přegenerování 3D modelu po změně rozměrů:
```bash
python3 model/generator.py model/
```

## 3D editor — co umí

- Nahrání grafiky na **stěnu B, stěnu A a LED podlahu**
- Grafika se **rozpočítá přes všechny panely** → hned vidíš, kde ji spára po 986 mm rozsekne
- Posuvníky rozměrů → přepočítá se počet panelů, plocha i spoty (1 na 3 m² dle GES)
- LED podlahu lze vypnout → ukáže šedý koberec z balíčku
- Spoty GES lze odebrat (pořadatel to povoluje) → uvidíš tlumené nasvícení
- Postava 1,75 m pro měřítko
- Export snímku do PNG

## Model pro externí nástroje

| Soubor | Kam |
|---|---|
| `model/stanek_S4244.stl` | SketchUp Free — **při importu zvol jednotky Millimeters** |
| `model/stanek_S4244.dae` | SketchUp Go/Pro, Blender — jednotky jsou uvnitř souboru |

> SketchUp Free **není licencovaný pro komerční použití**. Pro tenhle projekt je zdarma
> a legálně použitelný **Blender** (načte STL i DAE, umí i mapovat grafiku a renderovat).

## Potvrzené rozměry

| Co | Hodnota |
|---|---|
| Výška panelu | **2500 mm** |
| Grafická plocha | **2474 mm** |
| Modul panelu | **986 mm** |
| Textil přes celou stěnu | **2970 × 2474 mm** |
| Kratší stěna (A) | **2970 mm** = 3 panely |

## ⚠️ Co ještě není potvrzené

Model stojí na **dvou odhadech**:
- **Délka delší stěny 5940 mm** — odvozeno z půdorysu (~18 m²)
- **Tloušťka panelu 40 mm** — GES ji neuvádí

A čeká se na odpovědi GES (`iaapaeu@ges.com`):
1. **Povrch a materiál panelů** ← nejdůležitější, rozhoduje fólie vs. celoplošný wrap
2. Počet a rozpal panelů přímo pro S4244
3. Nosnost panelu pro TV
4. Přesný rozměr jmenovky

## Termíny

**24. 7. 2026** — Stand Layout Form + Risk Assessment. Kvůli LED podlaze (konstrukce na shell
scheme) i **Method Statement**.

Dál: rigging do 9. 8., elektro GES do 14. 8. Plný seznam v `data/stand-spec.json`.

## Poznámka k jmenovce

Obsah jmenovky je **pevně daný** pořadatelem (logo IAAPA + název firmy + číslo stánku, bílá/černá).
Branding tedy musí jít přes **panely, LED podlahu a volně stojící prvky** (max. 2,5 m).

## Struktura

```
AGENTS.md              ← kanonický kontext pro agenta
CLAUDE.md / GEMINI.md  odkazy na AGENTS.md (projekt se dělá s oběma modely)
data/stand-spec.json   ← jediný zdroj pravdy (rozměry, regulace, termíny, kontakty)
web/                   3D editor + datová stránka
model/                 generator.py + hotové STL/DAE
assets/brand/          sem patří brandové grafiky
assets/export/         rendery a snímky
.agent/skills/stand-3d/  skill pro agenta
AGENTS.md              kontext pro agenta
```
