#!/usr/bin/env python3
"""
Syntetycky model exponatu "Arcade" - herni LED podlaha s totemem.
Zadny STEP: stavi se z kvadru podle vizualizaci a rozmeru zadanych 13.7.2026
(bedna 1800x700x250, podlaha 1200x2400 = 4x8 dlazdic po 300, sikmina 80x80
kolem podlahy). Rozmery a umisteni cte z data/stand-spec.json (product_arcade).

Spousti se obycejnym python3 (bez FreeCADu):
    python3 model/export_arcade.py

Vystupy:
    web/arcade-mesh.js          - mesh pro viewer.html (three.js ramec, metry)
    model/arcade_v_stanku.stl   - souradnice STANKU (Z nahoru, mm), import
                                  do SketchUpu vedle stanek_S4244.stl
    model/arcade_v_stanku.dae   - totez pro SketchUp Go/Pro, Blender

Lokalni ramec (three.js konvence, mm):
    x = sirka  0..1360  (podel steny B)
    y = vyska  0..1800
    z = hloubka 0..2810 (zada bedny u steny B -> podlaha smerem do ulicky)
"""
import json
import os
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
spec = json.load(open(os.path.join(ROOT, "data", "stand-spec.json"), encoding="utf-8"))

T = spec["assumed"]["panel_thickness"]["value"]
MINI_CL = spec["product"]["placement"]["clearance_mm"]
MINI_LEN = spec["product"]["dims_mm"]["length"]
arc = spec["product_arcade"]
GAP = arc["placement"]["gap_from_mini_mm"]
CL_B = arc["placement"]["clearance_from_wall_b_mm"]
A = spec["confirmed"]["wall_a_length"]
B = spec["assumed"]["wall_b_length"]["value"]

d = arc["dims_mm"]
BED_W, BED_D, BED_H = d["bedna"]["width"], d["bedna"]["depth"], d["bedna"]["height"]
FLOOR_W, FLOOR_L = d["podlaha"]["width"], d["podlaha"]["length"]
TILE = d["podlaha"]["tile"]
H = d["podlaha"]["height"]
RAMP = d["sikmina"]

W = FLOOR_W + 2 * RAMP          # 1360 - vnejsi sirka
D = BED_D + 2 * RAMP + FLOOR_L  # 2810 - vnejsi hloubka
SEG_INSET = 15.0                # bily ramecek okolo svitici plochy dlazdice
SEG_THICK = 3.0

# rozlozeni barev 4x8 dle vizualizace (O = oranzova, P = fialova, M = mint);
# pevny "nahodny" vzor - stejny vysledek pri kazdem exportu
PATTERN = ["MOPO", "MMPO", "OPMM", "MOOP", "PMOM", "OMPO", "MPMO", "OMOP"]
LED_KEY = {"O": "led_a0", "P": "led_a1", "M": "led_a2"}

groups = {}  # name -> list trojuhelniku [(p0,p1,p2), ...] v lokalnim ramci


def emit(name, tris):
    groups.setdefault(name, []).extend(tris)


def quad(p0, p1, p2, p3):
    return [(p0, p1, p2), (p0, p2, p3)]


def box(name, x0, y0, z0, x1, y1, z1):
    """Kvadr s CCW vnejsim windingem (three.js, pravotocive souradnice)."""
    t = []
    t += quad((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0))  # +y
    t += quad((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1))  # -y
    t += quad((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1))  # +x
    t += quad((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0))  # -x
    t += quad((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))  # +z
    t += quad((x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (x1, y0, z0))  # -z
    emit(name, t)


def frustum(name, ox0, oz0, ox1, oz1, ix0, iz0, ix1, iz1, h):
    """Komoly jehlan: dolni obdelnik (vnejsi, y=0) -> horni (vnitrni, y=h).
    Tvori celou podlahovou platformu vc. sikmin po obvodu."""
    b0, b1 = (ox0, 0.0, oz0), (ox1, 0.0, oz0)
    b2, b3 = (ox1, 0.0, oz1), (ox0, 0.0, oz1)
    t0, t1 = (ix0, h, iz0), (ix1, h, iz0)
    t2, t3 = (ix1, h, iz1), (ix0, h, iz1)
    t = []
    t += quad(t0, t3, t2, t1)  # horni plocha (+y)
    t += quad(b0, b1, b2, b3)  # dno (-y)
    t += quad(b0, t0, t1, b1)  # -z (sikmina k bedne)
    t += quad(b3, b2, t2, t3)  # +z (predni sikmina)
    t += quad(b1, t1, t2, b2)  # +x (prava sikmina)
    t += quad(b0, b3, t3, t0)  # -x (leva sikmina)
    emit(name, t)


# ---------- stavba ----------
# bedna (totem s obrazovkou) - zada na z=0 (u steny B), celem k podlaze
bx0 = (W - BED_W) / 2
box("body", bx0, 0, 0, bx0 + BED_W, BED_H, BED_D)
# obrazovka na celni stene bedny (horni cast, dle vizualizace)
box("screen", bx0 + 70, 950, BED_D, bx0 + BED_W - 70, 1750, BED_D + 4)
# platebni terminal (maly panel pod obrazovkou)
box("screen", W / 2 - 65, 620, BED_D, W / 2 + 65, 800, BED_D + 3)

# podlahova platforma vc. sikmin = komoly jehlan (bile boky, bila horni plocha)
frustum("body", 0, BED_D, W, D, RAMP, BED_D + RAMP, W - RAMP, D - RAMP, H)

# svitici segmenty dlazdic (staticke barvy - blikat nesmi, regulace)
for j, row in enumerate(PATTERN):
    for i, ch in enumerate(row):
        x0 = RAMP + i * TILE
        z0 = BED_D + RAMP + j * TILE
        box(LED_KEY[ch], x0 + SEG_INSET, H, z0 + SEG_INSET,
            x0 + TILE - SEG_INSET, H + SEG_THICK, z0 + TILE - SEG_INSET)

ntris = sum(len(t) for t in groups.values())
print(f"Arcade: {ntris} trojuhelniku, footprint {W:.0f} x {D:.0f} x {BED_H:.0f} mm")

# ---------- web/arcade-mesh.js (three.js ramec, metry) ----------
order = ["body", "screen", "led_a0", "led_a1", "led_a2"]
js = [
    "// AUTOGENEROVANO skriptem model/export_arcade.py - NEEDITUJ RUCNE.",
    "// three.js ramec (Y nahoru), metry, lokalni ramec produktu:",
    f"// x 0..{W/1000:.3f} (sirka, podel steny B), y 0..{BED_H/1000:.3f} (vyska),"
    f" z 0..{D/1000:.3f} (bedna u z=0)",
    "const ARCADE_MESH = {",
    f"  dims_mm: {{ sirka: {W:.0f}, hloubka: {D:.0f}, vyska: {BED_H:.0f} }},",
    "  groups: [",
]
for name in order:
    pos, idx = [], []
    for tri in groups[name]:
        for p in tri:
            idx.append(len(pos) // 3)
            pos += [round(p[0] / 1000, 4), round(p[1] / 1000, 4), round(p[2] / 1000, 4)]
    js.append(f'    {{ name: "{name}", pos: [{",".join(f"{v:g}" for v in pos)}],'
              f' idx: [{",".join(str(i) for i in idx)}] }},')
js += ["  ]", "};", ""]
out_js = os.path.join(ROOT, "web", "arcade-mesh.js")
open(out_js, "w", encoding="utf-8").write("\n".join(js))
print(f"OK {out_js} ({os.path.getsize(out_js)//1024} kB)")

# ---------- souradnice stanku (Z nahoru, mm) ----------
X0 = T + MINI_CL + MINI_LEN + GAP  # zacatek arcade podel steny B (za mini)
Y0 = T + CL_B


def to_stand(p):
    return (X0 + p[0], Y0 + p[2], p[1])


def stand_tris():
    # prohozeni os y/z je zrcadleni -> obratit poradi vrcholu
    for name in order:
        for a, b, c in groups[name]:
            yield name, to_stand(a), to_stand(c), to_stand(b)


def write_stl(path):
    tris = list(stand_tris())
    with open(path, "wb") as f:
        f.write(b"arcade vedle mini, stanek S4244 (mm)".ljust(80, b" "))
        f.write(struct.pack("<I", len(tris)))
        for _, a, b, c in tris:
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            ln = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
            f.write(struct.pack("<12fH", nx / ln, ny / ln, nz / ln, *a, *b, *c, 0))


def write_dae(path):
    geos, nodes = [], []
    for name in order:
        pos, idx = [], []
        for gname, a, b, c in stand_tris():
            if gname != name:
                continue
            for p in (a, b, c):
                idx.append(len(pos) // 3)
                pos += list(p)
        n = len(pos) // 3
        pstr = " ".join(f"{v:.2f}" for v in pos)
        istr = " ".join(str(i) for i in idx)
        geos.append(f'''
    <geometry id="arc-{name}-geo" name="arcade_{name}">
      <mesh>
        <source id="arc-{name}-pos">
          <float_array id="arc-{name}-pos-a" count="{n*3}">{pstr}</float_array>
          <technique_common>
            <accessor source="#arc-{name}-pos-a" count="{n}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="arc-{name}-vtx"><input semantic="POSITION" source="#arc-{name}-pos"/></vertices>
        <triangles count="{len(idx)//3}">
          <input semantic="VERTEX" source="#arc-{name}-vtx" offset="0"/>
          <p>{istr}</p>
        </triangles>
      </mesh>
    </geometry>''')
        nodes.append(f'''
      <node id="arc-{name}-node" name="arcade_{name}" type="NODE">
        <instance_geometry url="#arc-{name}-geo"/>
      </node>''')
    dae = f'''<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <unit name="millimeter" meter="0.001"/>
    <up_axis>Z_UP</up_axis>
  </asset>
  <library_geometries>{''.join(geos)}
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="Scene" name="arcade_v_stanku">{''.join(nodes)}
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>'''
    open(path, "w").write(dae)


out_stl = os.path.join(HERE, "arcade_v_stanku.stl")
out_dae = os.path.join(HERE, "arcade_v_stanku.dae")
write_stl(out_stl)
write_dae(out_dae)
print(f"OK {out_stl} ({os.path.getsize(out_stl)//1024} kB)")
print(f"OK {out_dae} ({os.path.getsize(out_dae)//1024} kB)")

# ---------- kontrola vejde-se ----------
need_b = X0 + W
need_a = Y0 + D
over_b = max(0, need_b - B)
print(f"Kontrola: podel B {need_b:.0f} / {B} mm "
      f"{'OK' if not over_b else f'PRESAH {over_b:.0f} mm DO ULICKY!'}"
      f" | hloubka {need_a:.0f} / {A} mm {'OK' if need_a <= A else 'PRETEKA!'}")
if over_b:
    print("POZOR: arcade se vedle mini NEVEJDE - viz stand-spec.json "
          "product_arcade.fit_check (reseni ceka na rozhodnuti).")
