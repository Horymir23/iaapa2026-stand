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
import re
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "grafika"
OUT = ROOT / "web" / "gfx-default.js"

MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml"}

# SVG bez width/height se v <img> rasterizuje na vychozi velikost (300x150)
# a textura by byla rozmazana/deformovana -> doplnit rozmery z viewBoxu
# (x RASTER_SCALE, at je i velky dekal ostry).
RASTER_SCALE = 2
VIEWBOX = re.compile(r'viewBox="([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.\-]+)"')


def svg_bytes(p):
    txt = p.read_text(encoding="utf-8")
    if re.search(r"<svg[^>]*\swidth=", txt) is None:
        m = VIEWBOX.search(txt)
        if not m:
            raise SystemExit(f"{p.name}: SVG nema viewBox ani width/height")
        w, h = float(m.group(3)) * RASTER_SCALE, float(m.group(4)) * RASTER_SCALE
        txt = txt.replace("<svg ", f'<svg width="{w:.0f}" height="{h:.0f}" ', 1)
    return txt.encode("utf-8")


files = sorted(p for p in SRC.rglob("*") if p.suffix.lower() in MIME)
names = [p.name for p in files]
for n in names:
    if names.count(n) > 1:
        raise SystemExit(f"Kolize nazvu '{n}' - klicem bundlu je nazev souboru")
total = 0
with OUT.open("w", encoding="utf-8") as f:
    f.write("// GENEROVANO skriptem model/export_gfx.py — needituj rucne.\n")
    f.write("// Vychozi grafiky jako data URI, aby sly nacist i z file:// (CORS).\n")
    f.write("const GFX_DATA = {\n")
    for p in files:
        raw = svg_bytes(p) if p.suffix.lower() == ".svg" else p.read_bytes()
        data = base64.b64encode(raw).decode("ascii")
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
