# AGENTS.md

Kontext pro agenta pracujícího v tomto repozitáři.

## O co jde

Branding výstavního stánku **S4244** (název na plánu „Pixel Floors") pro **IAAPA Expo Europe 2026**,
ExCeL London, září 2026. Vystavovatel: **HTDM**.

Stánek je **rohový shell scheme** systému **GES AMP** — dvě bílé stěny 2,5 m, dvě strany otevřené
do uliček. Úkolem je přetvořit ho do vizuální podoby značky. Klíčovým prvkem je **LED podlaha**,
proto se počítá s tlumeným osvětlením.

## Zlaté pravidlo

**`data/stand-spec.json` je jediný zdroj pravdy.** Žádný rozměr nepiš natvrdo nikam jinam.
Když se rozměr mění → změň ho tam → přegeneruj model → řekni uživateli, co se změnilo.

Soubor rozlišuje `confirmed` (potvrzeno písemně), `assumed` (odhad) a `open_questions` (čeká na GES).
**Tyhle tři kategorie nikdy nemíchej.** Když stavíš na odhadu, řekni to nahlas.

## Co ještě není potvrzené

Nominální výměra plochy je potvrzená půdorysem haly (`data/preview.webp`): **3 × 6 m = 18 m²**,
dvě spojená místa 3×3 m. Pozor ale — nominální plocha ≠ stavební délka stěn (stěny stojí uvnitř
plochy: potvrzená stěna A má 2970 mm na nominální 3 m). Dvě věci v modelu proto zůstávají
**odhady**, ne fakta:
- **stavební délka delší stěny B** (5940 mm) — analogie ke stěně A: 2 × 2970 mm; přesný rozpal panelů musí potvrdit GES
- **tloušťka panelu** (40 mm) — GES ji v spec listu neuvádí

A pět otázek visí na GES / pořadateli (viz `open_questions` v spec souboru). Nejdůležitější je
**povrch panelů** — rozhoduje mezi řezanou fólií a celoplošným wrapem, takže bez něj nejde
finalizovat produkci grafiky.

## Skills

- `.agent/skills/stand-3d/` — práce s 3D modelem, mapování grafiky na panely, exporty, regulace.
  Načti ho vždy, když se dotýkáš geometrie, rozměrů, grafiky na stěnách nebo souborů ve `web/` a `model/`.

## Pracuje se tu se dvěma modely

Na projektu se střídá **Claude i Gemini**. Z toho plyne pár pravidel:

**Tento soubor (`AGENTS.md`) je kanonický kontext.** `CLAUDE.md` a `GEMINI.md` na něj jen odkazují
a přidávají drobnosti specifické pro daný model. Když se mění kontext projektu, **měň ho tady** —
ne ve třech souborech současně, jinak se rozejdou.

**Zjištění patří do souborů, ne do konverzace.** Druhý model tvůj chat nevidí. Když něco potvrdíš
nebo zjistíš — typicky odpověď od GES — zapiš to do `data/stand-spec.json` a přesuň z `assumed`
nebo `open_questions` do `confirmed`. Teprve tím to existuje pro celý projekt.

**Skill načítej explicitně.** Claude si `.agent/skills/stand-3d/SKILL.md` může natáhnout sám,
Gemini ne — u něj je to potřeba načíst ručně. Neodvozuj geometrii a mapování textur znovu od nuly,
je to popsané tam.

## Struktura

```
AGENTS.md              ← kanonický kontext (tento soubor)
CLAUDE.md / GEMINI.md  odkazy na AGENTS.md + poznámky pro daný model
data/stand-spec.json   zdroj pravdy — rozměry, regulace, termíny, kontakty, produkt
data/specifikace.md    čitelné shrnutí pro člověka
web/index.html         datová stránka (podklad pro branding)
web/viewer.html        3D editor v prohlížeči
web/mini-mesh.js       mesh produktu mini pro viewer (GENEROVANÝ — needitovat ručně)
web/arcade-mesh.js     mesh produktu arcade pro viewer (GENEROVANÝ — needitovat ručně)
web/kiosk-mesh.js      mesh kiosku „pult + monitor" pro viewer (GENEROVANÝ — needitovat ručně)
model/generator.py     generuje STL + DAE stánku
model/mini.stp         CAD model produktu „mini" (exponát — LED podlahová aréna)
model/export_mini.py   převod mini.stp → mesh pro viewer + STL/DAE (běží přes FreeCAD)
model/export_arcade.py syntetický model exponátu „arcade" (python3, bez FreeCADu)
model/export_kiosk.py  syntetické kiosky „pult + monitor" u uličky (python3, bez FreeCADu)
model/export_banner.py syntetický kruhový závěsný poutač „Zip-up Round" nad stánkem (python3)
model/*.stl *.dae      hotové modely pro SketchUp / Blender
assets/brand/          brandové grafiky (polepy, vizuál LED podlahy)
assets/export/         rendery a snímky
```

## Jak spustit

Stačí otevřít HTML v prohlížeči — nic se nebuildí, žádné závislosti:
```bash
open web/viewer.html     # 3D editor
open web/index.html      # datová stránka
python3 model/generator.py model/    # přegenerování STL + DAE stánku
# produkt mini (vyžaduje FreeCAD.app):
/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd model/export_mini.py
python3 model/export_arcade.py      # produkt arcade (bez závislostí)
python3 model/export_kiosk.py       # kiosky u uličky (bez závislostí)
python3 model/export_banner.py      # kruhový závěsný poutač nad stánkem (bez závislostí)
```

## Nejbližší termín

**24. 7. 2026** — Stand Layout Form + Risk Assessment. Kvůli LED podlaze (= konstrukce na shell
scheme) je podle regulací potřeba i **Method Statement**. Rozsah potvrdit u Operations.

## Tón

Uživatel je Čech, komunikuj česky. Je to obchodník/account manager, ne 3D grafik — vysvětluj
technické věci srozumitelně, ale nepodceňuj ho. Když něco není jisté, řekni to rovnou;
u výstavního stánku je špatný rozměr drahá chyba.
