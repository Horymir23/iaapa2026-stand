#!/usr/bin/env python3
"""Zabali vychozi grafiky z assets/grafika/ do web/gfx-default.js jako data URI.

PROC: web/viewer.html otevreny pres file:// (poklepani v Chromu) nemuze nacist
obrazky TextureLoaderem — Chrome je blokuje CORSem (origin null) a bez
crossorigin atributu je zase odmitne texImage2D (SecurityError, overeno
19.7.2026). Data URI jsou jedina cesta, ktera funguje z file:// i pres http.

Vystupem je globalni objekt GFX_DATA: {nazev_souboru: 'data:image/...;base64,...'}.
Viewer si v loadDefaultGraphics vezme data URI podle nazvu souboru z DEF_GFX /
DEF_SCR; kdyz soubor v bundlu chybi, spadne zpet na primou cestu (funkcni pres
http). Mapovani soubor->plocha zustava JEN ve viewer.html (DEF_GFX/DEF_SCR)
a v data/stand-spec.json (default_graphics) — tenhle skript je tupy: zabali
vsechny obrazky ve slozce.

Spusteni (po kazde zmene grafik v assets/grafika/):
    python3 model/export_gfx.py
"""

import base64
import pathlib
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "grafika"
OUT = ROOT / "web" / "gfx-default.js"

MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp"}

files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in MIME)
total = 0
with OUT.open("w", encoding="utf-8") as f:
    f.write("// GENEROVANO skriptem model/export_gfx.py — needituj rucne.\n")
    f.write("// Vychozi grafiky jako data URI, aby sly nacist i z file:// (CORS).\n")
    f.write("const GFX_DATA = {\n")
    for p in files:
        data = base64.b64encode(p.read_bytes()).decode("ascii")
        total += p.stat().st_size
        # macOS vraci nazvy souboru v NFD (rozlozena diakritika); retezce ve
        # viewer.html jsou NFC -> klic normalizovat, jinak lookup selze
        name = unicodedata.normalize("NFC", p.name)
        f.write(f"{name!r}: 'data:{MIME[p.suffix.lower()]};base64,{data}',\n")
    f.write("};\n")

print(f"{OUT.relative_to(ROOT)}: {len(files)} grafik, "
      f"zdroj {total/1048576:.1f} MB -> bundle {OUT.stat().st_size/1048576:.1f} MB")
for p in files:
    print(f"  {p.name}")
