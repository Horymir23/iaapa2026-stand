#!/usr/bin/env python3
"""
Synteticky model kruhoveho zavesneho poutace "Zip-up Round" NAD stankem.
Zadny STEP: stavi se jako tenkosteny valec (drum) podle rozmeru z katalogu
Showdown Displays. Rozmery, umisteni a vyska zaveseni cte z data/stand-spec.json
(hanging_banner).

VYBRAN Ø1520 (S), protoze vetsi Ø3050 (L) se dle regulI IAAPA nad tento stanek
nevejde (viz hanging_banner.size_choice ve spec souboru).

Spousti se obycejnym python3 (bez FreeCADu):
    python3 model/export_banner.py

Vystupy:
    model/banner_v_stanku.stl   - souradnice STANKU (Z nahoru, mm), import
                                  do SketchUpu vedle stanek_S4244.stl (sdili pocatek)
    model/banner_v_stanku.dae   - totez pro SketchUp Go/Pro, Blender

POZNAMKA: web/viewer.html si valec stavi VLASTNI (THREE.CylinderGeometry) — potrebuje
UV, aby se nahrana grafika obtocila po obvodu (360°). Tenhle skript proto NEgeneruje
banner-mesh.js; obe cesty ale ctou stejne rozmery ze spec souboru, takze se shoduji.

Souradny system (stanek, shodny s generator.py / export_arcade.py):
    roh stanku = [0,0,0]; x podel steny B, y podel steny A, z = vyska (nahoru, mm)
"""
import json
import math
import os
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
spec = json.load(open(os.path.join(ROOT, "data", "stand-spec.json"), encoding="utf-8"))

A = spec["confirmed"]["wall_a_length"]            # kratsi stena (podel y)
B = spec["assumed"]["wall_b_length"]["value"]     # delsi stena (podel x)
bn = spec["hanging_banner"]
R = bn["dims_mm"]["diameter"] / 2.0               # 760
H = bn["dims_mm"]["height"]                        # 610
Zb = bn["placement"]["bottom_mm"]                 # spodni hrana textilu (ODHAD)
Zt = Zb + H                                        # horni hrana textilu
WALL_T = 6.0                                       # nominalni tloustka textilu (jen pro solid)
Ri = R - WALL_T                                    # vnitrni polomer
SEG = 64                                           # segmentu po obvodu

# vodorovny stred poutace (viz hanging_banner.placement)
CX = B / 2.0
CY = (A + bn["placement"]["clearance_from_walls_mm"]) / 2.0

groups = {}  # name -> [(p0,p1,p2), ...] v souradnicich STANKU (Z nahoru, mm)


def emit(name, tris):
    groups.setdefault(name, []).extend(tris)


def ring(r, z):
    """SEG+1 bodu na kruznici o polomeru r ve vysce z (posledni = prvni)."""
    pts = []
    for i in range(SEG + 1):
        a = 2 * math.pi * i / SEG
        pts.append((CX + r * math.cos(a), CY + r * math.sin(a), z))
    return pts


def wall(name, r, outward):
    """Plast valce o polomeru r; outward=True => normaly ven, jinak dovnitr."""
    lo, hi = ring(r, Zb), ring(r, Zt)
    t = []
    for i in range(SEG):
        b0, b1, t0, t1 = lo[i], lo[i + 1], hi[i], hi[i + 1]
        if outward:
            t += [(b0, b1, t1), (b0, t1, t0)]
        else:
            t += [(b0, t1, b1), (b0, t0, t1)]
    emit(name, t)


def top_cap(name):
    """Plna horni deska (zavreny vrch, jako u produktu) — normala nahoru."""
    v = ring(R, Zt)
    c = (CX, CY, Zt)
    emit(name, [(c, v[i], v[i + 1]) for i in range(SEG)])


def bottom_ring(name):
    """Mezikruzi na spodni hrane (textil ma tloustku) — normala dolu."""
    o, ii = ring(R, Zb), ring(Ri, Zb)
    t = []
    for i in range(SEG):
        o0, o1, i0, i1 = o[i], o[i + 1], ii[i], ii[i + 1]
        t += [(o0, i0, i1), (o0, i1, o1)]
    emit(name, t)


# ---------- stavba ----------
wall("graphic", R, outward=True)    # vnejsi plast = potistena grafika (360°)
wall("inner", Ri, outward=False)    # vnitrni plast, bily (videt zespodu otevrenym dnem)
top_cap("cap")                      # zavreny vrch, bily
bottom_ring("cap")                  # spodni hrana textilu

ntris = sum(len(t) for t in groups.values())
top_g = Zt
print(f"Banner Zip-up Round Ø{2*R:.0f} × v{H:.0f} mm: {ntris} trojuhelniku, "
      f"stred [{CX:.0f}, {CY:.0f}], textil {Zb:.0f}–{Zt:.0f} mm")

order = ["graphic", "inner", "cap"]


def write_stl(path):
    tris = [(n, a, b, c) for n in order for (a, b, c) in groups[n]]
    with open(path, "wb") as f:
        f.write(b"Zip-up Round banner nad stankem S4244 (mm)".ljust(80, b" "))
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
        for a, b, c in groups[name]:
            for p in (a, b, c):
                idx.append(len(pos) // 3)
                pos += list(p)
        n = len(pos) // 3
        pstr = " ".join(f"{v:.2f}" for v in pos)
        istr = " ".join(str(i) for i in idx)
        geos.append(f'''
    <geometry id="ban-{name}-geo" name="banner_{name}">
      <mesh>
        <source id="ban-{name}-pos">
          <float_array id="ban-{name}-pos-a" count="{n*3}">{pstr}</float_array>
          <technique_common>
            <accessor source="#ban-{name}-pos-a" count="{n}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="ban-{name}-vtx"><input semantic="POSITION" source="#ban-{name}-pos"/></vertices>
        <triangles count="{len(idx)//3}">
          <input semantic="VERTEX" source="#ban-{name}-vtx" offset="0"/>
          <p>{istr}</p>
        </triangles>
      </mesh>
    </geometry>''')
        nodes.append(f'''
      <node id="ban-{name}-node" name="banner_{name}" type="NODE">
        <instance_geometry url="#ban-{name}-geo"/>
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
    <visual_scene id="Scene" name="banner_v_stanku">{''.join(nodes)}
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>'''
    open(path, "w").write(dae)


out_stl = os.path.join(HERE, "banner_v_stanku.stl")
out_dae = os.path.join(HERE, "banner_v_stanku.dae")
write_stl(out_stl)
write_dae(out_dae)
print(f"OK {out_stl} ({os.path.getsize(out_stl)//1024} kB)")
print(f"OK {out_dae} ({os.path.getsize(out_dae)//1024} kB)")

# ---------- kontrola vejde-se (odstupy od delicich sten, viz fit_check) ----------
cl = bn["placement"]["clearance_from_walls_mm"]
cl_b = CY - R                       # odstup od steny B (y=0)
cl_a = CX - R                       # odstup od steny A (x=0)
front = A - (CY + R)                # rezerva k predni hrane pudorysu
graf_max = spec["regulations"]["hanging_sign"]["max_graphic_height_to_top"]
ok = cl_b >= cl and cl_a >= cl and front >= 0 and top_g <= graf_max
print(f"Kontrola: odstup od steny B {cl_b:.0f} mm, od steny A {cl_a:.0f} mm "
      f"(min {cl}) | predni rezerva {front:.0f} mm | horni hrana {top_g:.0f} / "
      f"{graf_max} mm  {'OK' if ok else 'POZOR!'}")
if not ok:
    print("POZOR: poutac nesplnuje odstupy/limity — viz hanging_banner.fit_check.")
