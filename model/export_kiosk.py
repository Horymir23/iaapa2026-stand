#!/usr/bin/env python3
"""
Synteticky model kiosku "pult + monitor" a stolu s polickou u ulicky.

Kiosek: odvozen z pultu se sikmym displejem u vstupni branky produktu mini
(dily PLECH MONITOR VRCH/SPODEK v mini.stp, zmereno 15.7.2026): sikma horni
deska 30 stupnu. Sirka pultu dle zadani = skrin + 2x mensi z okraju
puvodniho pultu (31,2 mm) = 580 mm. Telo je plny bily kvadr se sikmou horni
plochou, az na zem. Monitor je bezrameckovy FHD panel 16:9 integrovany do
sikminy (zadani 17.7.2026): v sikme plose je otvor presne na miru skla,
LIC SKLA LEZI PRESNE V ROVINE SIKMINY (zadny schod - pozadavek 17.7.2026),
sklo je pruhledne a pod nim je tmava vyplne panelu; grafika se ve vieweru
kresli POD sklem na tuto vyplne.

ZMENA 21.7.2026 (zadani + nacrt uzivatele): kiosky jsou OTOCENE OD SEBE,
zady (delsi stranou 580 mm) proti sobe - kiosek 1 monitorem ke stene A,
kiosek 2 monitorem k arcade. Lide u nich stoji UVNITR stanku, ne v ulicce.
Mezi zady kiosku je STUL s polickou na tiskoviny (spec product_kiosk.table):
deska 600 mm dlouha (zadano), hloubka sestavy 580 = sirka kiosku (zadano),
zepredu (z ulicky) kryci deska, nad ni sikma police 45 stupnu s brozurami
licem do ulicky; kryci deska presahuje 60 mm nad spodni hranu police jako
zarazka, at letaky nespadnou. Vysky/tloustky/uhel police = NAVRH.
Rozmery a umisteni cte z data/stand-spec.json (product_kiosk) - zdroj pravdy.

Spousti se obycejnym python3 (bez FreeCADu):
    python3 model/export_kiosk.py

Vystupy:
    web/kiosk-mesh.js          - KIOSK_MESH (JEDEN kiosek, viewer ho klonuje
                                 a otaci v build()) + TABLE_MESH (stul,
                                 three.js ramec, metry)
    model/kiosk_v_stanku.stl   - oba OTOCENE kiosky + stul v souradnicich
                                 STANKU (Z nahoru, mm), import do SketchUpu
                                 vedle stanek_S4244.stl
    model/kiosk_v_stanku.dae   - totez pro SketchUp Go/Pro, Blender

Lokalni ramec kiosku (three.js konvence, mm):
    x = sirka  0..580   y = vyska 0..1196
    z = hloubka 0..340  (z=0 zadni vyssi hrana/zada, z=340 predni lic,
                         sikmina s monitorem klesa k +z)
Lokalni ramec stolu (mm):
    x = delka 0..600    y = vyska 0..1196
    z = hloubka 0..580  (z=0 vnitrek stanku, z=580 predni lic v hrane ulicky)
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
SCR_W, SCR_L = mon["screen"]["width"], mon["screen"]["length_on_slope"]

GAPW = k["placement"]["gap_from_wall_a_mm"]     # zapadni mezera od lice steny A
td = k["table"]["dims_mm"]
TL = td["deska"]["length"]                      # delka stolu (zadano 600)
DES_T = td["deska"]["thickness"]
DES_TOP = td["deska"]["top_height"]
KR_T = td["kryci_deska"]["thickness"]
KR_B = td["kryci_deska"]["bottom"]
KR_TOP = td["kryci_deska"]["top"]
POL_DEG = td["police"]["angle_deg"]
POL_LO = td["police"]["edge_low_mm"]
POL_HI = td["police"]["edge_high_mm"]
POL_T = td["police"]["thickness"]

SCR_T = 0.8   # tloustka skla; LIC presne v rovine sikminy (h = -0.8..0)
BACK_D = 1.3  # horni lic tmave vyplne panelu pod sklem (grafika lezi nad nim)

# sikma horni plocha: z hrany (y=HB, z=0) do hrany (y=HF, z=D)
L = math.hypot(D, HB - HF)          # delka sikminy (~392 mm)
s = ((HF - HB) / L, D / L)          # smer po spadu (y, z)
n = (D / L, (HB - HF) / L)          # vnejsi normala sikminy (y, z)

groups = {}


def emit(name, tris, into=None):
    (groups if into is None else into).setdefault(name, []).extend(tris)


def quad(p0, p1, p2, p3):
    return [(p0, p1, p2), (p0, p2, p3)]


# ---------- telo pultu: plny kvadr se sikmou horni plochou ----------
# Sikma plocha ma OTVOR presne na miru skla monitoru - sklo pak muze lezet
# licem presne v rovine sikminy, aniz by se koplanarni plochy praly (z-fighting).
def pult(name, hole):
    """hole = (x0, x1, t0, t1) otvoru na sikmine (t = po spadu od zadni hrany)."""
    def sp(x, tt):
        return (x, HB + tt * s[0], tt * s[1])
    x0, x1, t0, t1 = hole
    t = []
    t += quad((0, 0, D), (W, 0, D), (W, HF, D), (0, HF, D))    # predni lic (+z)
    t += quad((0, 0, 0), (0, HB, 0), (W, HB, 0), (W, 0, 0))    # zadni stena (-z)
    t += quad((0, 0, 0), (W, 0, 0), (W, 0, D), (0, 0, D))      # dno (-y)
    t += quad(sp(0, 0), sp(0, t0), sp(W, t0), sp(W, 0))        # sikmina nad otvorem
    t += quad(sp(0, t1), sp(0, L), sp(W, L), sp(W, t1))        # sikmina pod otvorem
    t += quad(sp(0, t0), sp(0, t1), sp(x0, t1), sp(x0, t0))    # sikmina vlevo
    t += quad(sp(x1, t0), sp(x1, t1), sp(W, t1), sp(W, t0))    # sikmina vpravo
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


# ---------- osove rovnobezny kvadr (pro stul) ----------
def box(x0, x1, y0, y1, z0, z1):
    t = []
    t += quad((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))  # +z
    t += quad((x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (x1, y0, z0))  # -z
    t += quad((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1))  # -y
    t += quad((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0))  # +y
    t += quad((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1))  # +x
    t += quad((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0))  # -x
    return t


# ---------- stavba kiosku ----------
# sklo bezrameckoveho FHD monitoru centrovane na sikmine (boky 31,2 mm dle
# zadani); lic skla presne v rovine sikminy, pod nim tmava vyplne panelu
# (o 10 mm vetsi, aby pres pruhledne sklo nebylo sikmo videt do dutiny tela)
st0 = (L - SCR_L) / 2
sx0, sx1 = (W - SCR_W) / 2, (W + SCR_W) / 2
pult("body", (sx0, sx1, st0, st0 + SCR_L))
slope_box("sklo", sx0, sx1, st0, st0 + SCR_L, -SCR_T, 0)
slope_box("screen", sx0 - 10, sx1 + 10, st0 - 10, st0 + SCR_L + 10,
          -BACK_D - 1.0, -BACK_D)

# ---------- stavba stolu s polickou (lokalni ramec stolu) ----------
# deska stolu konci na vnitrnim lici kryci desky (562), aby cela na z=580
# nebyla koplanarni s kryci deskou (z-fighting)
tbl_groups = {}
ZF = W - KR_T                                   # vnitrni lic kryci desky
emit("body", box(0, TL, DES_TOP - DES_T, DES_TOP, 0, ZF), tbl_groups)   # deska
emit("body", box(0, TL, KR_B, KR_TOP, ZF, W), tbl_groups)               # kryci deska

# police: prkno ve sklonu POL_DEG, spodni hrana horniho povrchu na vnitrnim
# lici kryci desky (y=POL_LO, z=ZF), stoupa dovnitr stanku k y=POL_HI;
# tloustka POL_T kolmo pod povrch. Kryci deska konci KR_TOP = POL_LO + zarazka.
rad = math.radians(POL_DEG)
run = (POL_HI - POL_LO) / math.tan(rad)
ZB = ZF - run                                   # z horni hrany police
pn = (math.cos(rad), math.sin(rad))             # normala povrchu (y, z)


def pol(x, hi, top):
    y = POL_HI if hi else POL_LO
    z = ZB if hi else ZF
    if not top:
        y -= POL_T * pn[0]
        z -= POL_T * pn[1]
    return (x, y, z)


ptr = []
ptr += quad(pol(0, 0, 1), pol(TL, 0, 1), pol(TL, 1, 1), pol(0, 1, 1))  # povrch (+n)
ptr += quad(pol(0, 0, 0), pol(0, 1, 0), pol(TL, 1, 0), pol(TL, 0, 0))  # rub (-n)
ptr += quad(pol(0, 0, 1), pol(0, 0, 0), pol(TL, 0, 0), pol(TL, 0, 1))  # spodni hrana
ptr += quad(pol(0, 1, 1), pol(TL, 1, 1), pol(TL, 1, 0), pol(0, 1, 0))  # horni hrana
ptr += quad(pol(0, 0, 1), pol(0, 1, 1), pol(0, 1, 0), pol(0, 0, 0))    # bok (-x)
ptr += quad(pol(TL, 0, 1), pol(TL, 0, 0), pol(TL, 1, 0), pol(TL, 1, 1))  # bok (+x)
emit("body", ptr, tbl_groups)

ntris = sum(len(t) for t in groups.values())
nttris = sum(len(t) for t in tbl_groups.values())
print(f"Kiosk: {ntris} trojuhelniku, telo {W:.0f} x {D:.0f} mm, "
      f"vyska {HB:.0f}/{HF:.0f} mm, sikmina {math.degrees(math.atan2(HB - HF, D)):.1f} st.")
print(f"Stul: {nttris} trojuhelniku, deska {TL:.0f} x {ZF:.0f} mm v {DES_TOP:.0f} mm, "
      f"police {POL_DEG} st. ({POL_LO:.0f}-{POL_HI:.0f} mm), zarazka {KR_TOP - POL_LO:.0f} mm")

# ---------- web/kiosk-mesh.js (three.js ramec, metry) ----------
order = ["body", "screen", "sklo"]


def js_group(name, tris):
    pos, idx = [], []
    for tri in tris:
        for p in tri:
            idx.append(len(pos) // 3)
            pos += [round(p[0] / 1000, 4), round(p[1] / 1000, 4), round(p[2] / 1000, 4)]
    return (f'    {{ name: "{name}", pos: [{",".join(f"{v:g}" for v in pos)}],'
            f' idx: [{",".join(str(i) for i in idx)}] }},')


js = [
    "// AUTOGENEROVANO skriptem model/export_kiosk.py - NEEDITUJ RUCNE.",
    "// three.js ramec (Y nahoru), metry.",
    "// KIOSK_MESH = JEDEN kiosek v lokalnim ramci (x sirka, z hloubka, sikmina",
    "// klesa k +z); viewer ho klonuje a OTACI kolem Y - kiosek 1 celem ke stene A,",
    "// kiosek 2 celem k arcade (zmena 21.7.2026, zady k sobe).",
    "const KIOSK_MESH = {",
    f"  dims_mm: {{ sirka: {W:.0f}, hloubka: {D:.0f}, vyska: {HB:.0f} }},",
    f"  count: {N},",
    "  groups: [",
]
for name in order:
    js.append(js_group(name, groups[name]))
js += ["  ]", "};", ""]
js += [
    "// TABLE_MESH = stul s polickou mezi zady kiosku (spec product_kiosk.table):",
    "// x delka, z hloubka (z=0 vnitrek stanku, z=max predni lic v hrane ulicky)",
    "const TABLE_MESH = {",
    f"  dims_mm: {{ delka: {TL:.0f}, hloubka: {W:.0f}, vyska: {POL_HI:.0f} }},",
    "  groups: [",
    js_group("body", tbl_groups["body"]),
    "  ]",
    "};",
    "",
]
out_js = os.path.join(ROOT, "web", "kiosk-mesh.js")
open(out_js, "w", encoding="utf-8").write("\n".join(js))
print(f"OK {out_js} ({os.path.getsize(out_js)} B)")

# ---------- souradnice stanku (Z nahoru, mm) ----------
# Sestava podel hrany ulicky (y = A): zapadni mezera GAPW od lice steny A,
# pak kiosek 1 (celem ke stene A), stul, kiosek 2 (celem k arcade); zbytek
# useku k arcade = pruchod do stanku.
LO = T
HI = T + CL + MINI_LEN + ARC_GAP  # zacatek arcade podel steny B
K1_X = LO + GAPW                  # predni lic kiosku 1
TBL_X = K1_X + D                  # zada kiosku 1 = zacatek stolu
K2_X = TBL_X + TL                 # konec stolu = zada kiosku 2
GAP_E = HI - (K2_X + D)           # pruchod mezi kioskem 2 a arcade
Y0 = A - W                        # zadni hrana sestavy (predni lic na y = A)


def stand_tris():
    # vsechna zobrazeni jsou zrcadleni (det -1) -> obratit poradi vrcholu.
    # kiosek 1: lokalni +z (celo) miri k -X (ke stene A), sirka podel hloubky stanku
    for name in order:
        for a, b, c in groups[name]:
            yield from _mirror3(name,
                                [(K1_X + D - p[2], Y0 + p[0], p[1]) for p in (a, b, c)])
    # kiosek 2: lokalni +z miri k +X (k arcade)
    for name in order:
        for a, b, c in groups[name]:
            yield from _mirror3(name,
                                [(K2_X + p[2], A - p[0], p[1]) for p in (a, b, c)])
    # stul: bez rotace, lokalni +z miri do ulicky (+Y stanku)
    for a, b, c in tbl_groups["body"]:
        yield from _mirror3("stul",
                            [(TBL_X + p[0], Y0 + p[2], p[1]) for p in (a, b, c)])


def _mirror3(name, pts):
    a, b, c = pts
    yield (name, a, c, b)


def write_stl(path):
    tris = list(stand_tris())
    with open(path, "wb") as f:
        f.write(b"kiosky + stul u ulicky, stanek S4244 (mm)".ljust(80, b" "))
        f.write(struct.pack("<I", len(tris)))
        for _, a, b, c in tris:
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            ln = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
            f.write(struct.pack("<12fH", nx / ln, ny / ln, nz / ln, *a, *b, *c, 0))


def write_dae(path):
    geos, nodes = [], []
    for name in order + ["stul"]:
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
print(f"Sestava (mm): mezera od steny A {GAPW} | kiosek 1 x {K1_X:.0f}..{TBL_X:.0f}"
      f" (celem ke stene A) | stul x {TBL_X:.0f}..{K2_X:.0f} | kiosek 2 x"
      f" {K2_X:.0f}..{K2_X + D:.0f} (celem k arcade) | pruchod {GAP_E:.0f} k arcade (x={HI:.0f})")
ok_gap = GAP_E >= 750 + 900   # clovek u kiosku 2 + pruchod jednoho cloveka
ok_depth = Y0 >= T + CL + MINI_DEPTH
ok_h = max(HB, POL_HI) <= H_MAX
print(f"Kontrola: pruchod k arcade {GAP_E:.0f} mm (>= 750 cloveka + 900 pruchod)"
      f" {'OK' if ok_gap else 'TESNO!'}"
      f" | zadni hrana y={Y0:.0f} vs mini {T + CL + MINI_DEPTH}"
      f" (koridor {Y0 - (T + CL + MINI_DEPTH):.0f} mm) {'OK' if ok_depth else 'KOLIZE S MINI!'}"
      f" | vyska {max(HB, POL_HI):.0f} / {H_MAX} mm {'OK' if ok_h else 'PRES LIMIT!'}")
print("POZOR: pozice zavisi na tloustce panelu (ODHAD) a na delce steny B"
      " (ODHAD) - arcade po zkraceni mini (21.7.2026) konci presne v hrane.")
