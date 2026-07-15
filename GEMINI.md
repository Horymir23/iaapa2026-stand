# GEMINI.md

> Kanonický kontext projektu je v **[AGENTS.md](./AGENTS.md)**. Přečti si ho jako první.
> Tenhle soubor jen doplňuje, co je specifické pro Gemini.

## Povinná četba pro 3D práci

Projekt má znalostní dokument **`.agent/skills/stand-3d/SKILL.md`**.
Gemini nemá automatické načítání skillů — **načti ho ručně**, kdykoli se dotýkáš:
- geometrie stánku, rozměrů, panelů
- grafiky na stěnách nebo LED podlaze
- souborů ve `web/` nebo `model/`
- exportu STL / DAE

Obsahuje souřadné systémy (pozor: generátor má výšku v Z, three.js v Y), vzorec pro dopočet spár,
matematiku mapování grafiky přes panely a omezení three.js r128.

## Zlaté pravidlo

`data/stand-spec.json` je **jediný zdroj pravdy**. Rozměry nepiš natvrdo nikam jinam.
Rozlišuj `confirmed` / `assumed` / `open_questions` a **nikdy je nemíchej** —
délka delší stěny a tloušťka panelu jsou **odhady**, ne fakta.

## Poznámka ke sdílenému projektu

Na projektu se pracuje **střídavě s Gemini i Claudem**. Nezaváděj konvence, které dávají smysl
jen tobě — kontext patří do `AGENTS.md`, ne do tohoto souboru. Když něco zjistíš nebo potvrdíš
(např. odpověď od GES), zapiš to do `data/stand-spec.json`, aby to měl i druhý model.
