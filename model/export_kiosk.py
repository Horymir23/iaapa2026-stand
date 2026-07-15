#!/usr/bin/env python3
"""
Synteticky model kiosku "pult + monitor" u ulicky.

Odvozeno z pultu se sikmym displejem u vstupni branky produktu mini
(dily PLECH MONITOR VRCH/SPODEK + DISPLEJ/DISPLEJ001 v mini.stp, zmereno
15.7.2026): sikma horni deska 30 stupnu, skrin displeje 517,6 x 313,5 mm,
aktivni plocha 417,6 x 214,1 mm. Sirka pultu dle zadani = skrin + 2x mensi
z okraju puvodniho pultu (31,2 mm) = 580 mm. Telo je plny bily kvadr se
sikmou horni plochou, az na zem. Rozmery a umisteni cte z
data/stand-spec.json (product_kiosk) - zdroj pravdy.

Spousti se obycejnym python3 (bez FreeCADu):
    python3 model/export_kiosk.py

Vystupy:
    web/kiosk-mesh.js          - mesh JEDNOHO kiosku pro viewer.html
                                 (three.js ramec, metry; viewer ho klonuje
                                 na pozice spocitane v build())
    model/kiosk_v_stanku.stl   - OBA kiosky v souradnicich STANKU (Z nahoru,
                                 mm), import do SketchUpu vedle stanek_S4244.stl
    model/kiosk_v_stanku.dae   - totez pro SketchUp Go/Pro, Blender

Lokalni ramec (three.js konvence, mm):
    x = sirka  0..580   (podel hrany ulicky)
    y = vyska  0..1196
    z = hloubka 0..340  (z=0 zadni vyssi hrana do stanku, z=340 predni lic
                         do ulicky - sikmina s monitorem klesa do ulicky)
"""
import json
import math
import os
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
spec = json.load(open(os.path.join(ROOT, "data", "stand-spec.json"), encoding="utf-8"))

T = spec["assumed"]["panel_thickness"]["value"]
CL = spec["product"]["placement"]["clearance_mm"]
MINI_LEN = spec["product"]["dims_mm"]["length"]
MINI_DEPTH = spec["product"]["dims_mm"]["width"]
ARC_GAP = spec["product_arcade"]["placement"]["gap_from_mini_mm"]
A = spec["confirmed"]["wall_a_length"]
B = spec["assumed"]["wall_b_length"]["value"]
H_MAX = spec["confirmed"]["freestanding_max_height_on_3m_side"]

k = spec["product_kiosk"]
N = k["count"]
body = k["dims_mm"]["body"]
W, D = body["width"], body["depth"]
HB, HF = body["height_back"], body["height_front"]
mon = k["dims_mm"]["monitor"]
MON_W, MON_L = mon["housing"]["width"], mon["housing"]["length_on_slope"]
SCR_W, SCR_L = mon["screen"]["width"], mon["screen"]["length_on_slope"]

MON_H = 12.0  # jak moc skrin displeje vystupuje nad sikminu
SCR_H = 1.0   # obrazovka tesne nad celem skrine (aby se plochy neprekryvaly)

# sikma horni plocha: z hrany (y=HB, z=0) do hrany (y=HF, z=D)
L = math.hypot(D, HB - HF)          # delka sikminy (~392 mm)
s = ((HF - HB) / L, D / L)          # smer po spadu (y, z)
n = (D / L, (HB - HF) / L)          # vnejsi normala sikminy (y, z)

groups = {}


def emit(name, tris):
    groups.setdefault(name, []).extend(tris)


def quad(p0, p1, p2, p3):
    return [(p0, p1, p2), (p0, p2, p3)]


# ---------- telo pultu: plny kvadr se sikmou horni plochou ----------
def pult(name):
    t = []
    t += quad((0, 0, D), (W, 0, D), (W, HF, D), (0, HF, D))    # predni lic (+z)
    t += quad((0, 0, 0), (0, HB, 0), (W, HB, 0), (W, 0, 0))    # zadni stena (-z)
    t += quad((0, 0, 0), (W, 0, 0), (W, 0, D), (0, 0, D))      # dno (-y)
    t += quad((0, HB, 0), (0, HF, D), (W, HF, D), (W, HB, 0))  # sikma horni plocha
    t += quad((W, 0, 0), (W, HB, 0), (W, HF, D), (W, 0, D))    # bok (+x)
    t += quad((0, 0, 0), (0, 0, D), (0, HF, D), (0, HB, 0))    # bok (-x)
    emit(name, t)


# ---------- kvadr polozeny na sikmine ----------
def slope_box(name, x0, x1, t0, t1, h0, h1):
    """t = vzdalenost po spadu od zadni horni hrany, h = kolmo nad sikminou."""
    def p(x, t, h):
        return (x, HB + t * s[0] + h * n[0], t * s[1] + h * n[1])
    tr = []
    tr += quad(p(x0, t0, h1), p(x0, t1, h1), p(x1, t1, h1), p(x1, t0, h1))  # celo (+n)
    tr += quad(p(x0, t0, h0), p(x1, t0, h0), p(x1, t1, h0), p(x0, t1, h0))  # rub (-n)
    tr += quad(p(x1, t0, h0), p(x1, t0, h1), p(x1, t1, h1), p(x1, t1, h0))  # bok (+x)
    tr += quad(p(x0, t0, h0), p(x0, t1, h0), p(x0, t1, h1), p(x0, t0, h1))  # bok (-x)
    tr += quad(p(x0, t1, h0), p(x1, t1, h0), p(x1, t1, h1), p(x0, t1, h1))  # dolni hrana (+s)
    tr += quad(p(x0, t0, h0), p(x0, t0, h1), p(x1, t0, h1), p(x1, t0, h0))  # horni hrana (-s)
    emit(name, tr)


# ---------- stavba ----------
pult("body")
# skrin displeje centrovana na sikmine (boky presne 31,2 mm dle zadani)
mt0 = (L - MON_L) / 2
slope_box("screen", (W - MON_W) / 2, (W + MON_W) / 2, mt0, mt0 + MON_L, 0, MON_H)
st0 = (L - SCR_L) / 2
slope_box("screen", (W - SCR_W) / 2, (W + SCR_W) / 2, st0, st0 + SCR_L,
          MON_H, MON_H + SCR_H)

ntris = sum(len(t) for t in groups.values())
print(f"Kiosk: {ntris} trojuhelniku, telo {W:.0f} x {D:.0f} mm, "
      f"vyska {HB:.0f}/{HF:.0f} mm, sikmina {math.degrees(math.atan2(HB - HF, D)):.1f} st.")

# ---------- web/kiosk-mesh.js (three.js ramec, metry, JEDEN kiosk) ----------
order = ["body", "screen"]
js = [
    "// AUTOGENEROVANO skriptem model/export_kiosk.py - NEEDITUJ RUCNE.",
    "// three.js ramec (Y nahoru), metry, lokalni ramec JEDNOHO kiosku:",
    f"// x 0..{W/1000:.3f} (sirka), y 0..{HB/1000:.3f} (vyska),"
    f" z 0..{D/1000:.3f} (z=0 zadni hrana, sikmina klesa k +z = do ulicky)",
    "const KIOSK_MESH = {",
    f"  dims_mm: {{ sirka: {W:.0f}, hloubka: {D:.0f}, vyska: {HB:.0f} }},",
    f"  count: {N},",
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
out_js = os.path.join(ROOT, "web", "kiosk-mesh.js")
open(out_js, "w", encoding="utf-8").write("\n".join(js))
print(f"OK {out_js} ({os.path.getsize(out_js)} B)")

# ---------- souradnice stanku (Z nahoru, mm): oba kiosky u hrany ulicky ----------
# rovnomerne ve volnem useku mezi licem steny A a zacatkem arcade
LO = T
HI = T + CL + MINI_LEN + ARC_GAP  # zacatek arcade podel steny B
GAP = (HI - LO - N * W) / (N + 1)
X0S = [LO + GAP * (i + 1) + W * i for i in range(N)]
Y0 = A - D  # predni lic v hrane stanku (y = A)


def stand_tris():
    # prohozeni os y/z je zrcadleni -> obratit poradi vrcholu
    for x0 in X0S:
        for name in order:
            for a, b, c in groups[name]:
                yield (name,
                       (x0 + a[0], Y0 + a[2], a[1]),
                       (x0 + c[0], Y0 + c[2], c[1]),
                       (x0 + b[0], Y0 + b[2], b[1]))


def write_stl(path):
    tris = list(stand_tris())
    with open(path, "wb") as f:
        f.write(b"kiosky u ulicky, stanek S4244 (mm)".ljust(80, b" "))
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
        cnt = len(pos) // 3
        pstr = " ".join(f"{v:.2f}" for v in pos)
        istr = " ".join(str(i) for i in idx)
        geos.append(f'''
    <geometry id="kio-{name}-geo" name="kiosk_{name}">
      <mesh>
        <source id="kio-{name}-pos">
          <float_array id="kio-{name}-pos-a" count="{cnt*3}">{pstr}</float_array>
          <technique_common>
            <accessor source="#kio-{name}-pos-a" count="{cnt}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="kio-{name}-vtx"><input semantic="POSITION" source="#kio-{name}-pos"/></vertices>
        <triangles count="{len(idx)//3}">
          <input semantic="VERTEX" source="#kio-{name}-vtx" offset="0"/>
          <p>{istr}</p>
        </triangles>
      </mesh>
    </geometry>''')
        nodes.append(f'''
      <node id="kio-{name}-node" name="kiosk_{name}" type="NODE">
        <instance_geometry url="#kio-{name}-geo"/>
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
    <visual_scene id="Scene" name="kiosky_v_stanku">{''.join(nodes)}
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>'''
    open(path, "w").write(dae)


out_stl = os.path.join(HERE, "kiosk_v_stanku.stl")
out_dae = os.path.join(HERE, "kiosk_v_stanku.dae")
write_stl(out_stl)
write_dae(out_dae)
print(f"OK {out_stl} ({os.path.getsize(out_stl)//1024} kB)")
print(f"OK {out_dae} ({os.path.getsize(out_dae)//1024} kB)")

# ---------- kontrola vejde-se ----------
poz = ", ".join(f"x {x0:.0f}..{x0 + W:.0f}" for x0 in X0S)
print(f"Pozice kiosku (mm): {poz} | mezery {GAP:.0f} mm | predni lic y={A}")
ok_gap = GAP >= 0
ok_depth = Y0 >= T + CL + MINI_DEPTH
ok_h = HB <= H_MAX
print(f"Kontrola: volny usek {HI - LO:.0f} mm {'OK' if ok_gap else 'NEVEJDOU SE!'}"
      f" | zadni hrana y={Y0:.0f} vs mini {T + CL + MINI_DEPTH} "
      f"{'OK' if ok_depth else 'KOLIZE S MINI!'}"
      f" | vyska {HB:.0f} / {H_MAX} mm {'OK' if ok_h else 'PRES LIMIT!'}")
print("POZOR: pozice zavisi na tloustce panelu (ODHAD) a na poloze arcade,"
      " jejiz presah 187 mm pres hranu stanku neni vyreseny.")
