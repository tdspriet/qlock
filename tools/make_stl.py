#!/usr/bin/env python3
"""
Generate and check every print file of the QLOCK.

    .venv/bin/python tools/make_stl.py

You only need this if you change a dimension: the files in stl/ are already
made. Every number lives in the block below. The script writes stl/*.stl and
stl/preview.svg, then re-reads the files it wrote and checks them.
"""
import json
from pathlib import Path

import numpy as np
import trimesh
from shapely.affinity import scale, translate
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
LETTERS = Path(__file__).with_name("letters.json")
OUT = ROOT / "stl"

# ------------------------------------------------------------- dimensions, mm
COLS, ROWS = 11, 10
PLATE = 450.0               # the finished square face
COL_PITCH = 1000.0 / 30.0   # 33.333: one LED of a 30 LED/m strip per letter
ROW_PITCH = 110.0 / 3.0     # 36.667: makes the border equal on all four sides

FACE_T = 2.5                # faceplate thickness (black)
INLAY_T = 0.4               # white skin in the letters = the diffuser. 2 layers.
DOT_D = 5.0                 # the four minute dots

WALL_T = 1.6                # light-box walls
WALL_H = 18.0               # faceplate to LED panel
RIM_T = 4.0                 # outer rim of the grid
STRIP_W, STRIP_H = 12.0, 2.5   # slot where the LED strip passes under a wall
WIRE_W, WIRE_H = 7.5, 3.5      # notch for three 0.5 mm2 wires; WIRE_H also at the strip ends

# Bambu Lab H2D. One-colour parts must fit one nozzle's area (325 x 320) with
# a brim. Two-colour parts must fit the area both nozzles reach, next to a
# prime tower.
BED_ONE, BRIM = (325.0, 320.0), 5.0
BED_TWO, TOWER = (300.0, 320.0), 45.0

# ------------------------------------------------------------------- layout
# Design coordinates: looking at the FRONT, origin bottom-left, z = 0 is the
# front of the faceplate / the faceplate side of the grid.
MARGIN_X = (PLATE - (COLS - 1) * COL_PITCH) / 2     # 58.33
MARGIN_Y = (PLATE - (ROWS - 1) * ROW_PITCH) / 2     # 60.00
col_x = [MARGIN_X + c * COL_PITCH for c in range(COLS)]
row_y = [PLATE - MARGIN_Y - r * ROW_PITCH for r in range(ROWS)]   # row 0 = top

# Wall lines: half a pitch around every letter, so all 110 boxes are equal.
wall_x = [col_x[0] + (i - 0.5) * COL_PITCH for i in range(COLS + 1)]
wall_y = [row_y[-1] + (j - 0.5) * ROW_PITCH for j in range(ROWS + 1)]

# The border between rim and letters is a ring of dark boxes. The four corner
# boxes each hold one minute dot; MID is the middle of that ring.
MID = (RIM_T + wall_x[0] - WALL_T / 2) / 2          # 22.43 from the edge
DOTS = {"TL": (MID, PLATE - MID), "TR": (PLATE - MID, PLATE - MID),
        "BR": (PLATE - MID, MID), "BL": (MID, MID)}

# Four tiles each. The seams sit on wall lines, and the faceplate and grid are
# split along different ones, so each part bridges the other's joints.
FACE_SEAM = (wall_x[5], wall_y[5])                  # 208.33, 225.00
GRID_SEAM = (wall_x[6], wall_y[6])                  # 241.67, 261.67
SAMPLE = box(wall_x[-3] - WALL_T / 2, wall_y[-3] - WALL_T / 2, PLATE, PLATE)


def tiles(seam):
    sx, sy = seam
    return {"TL": box(0, sy, sx, PLATE), "TR": box(sx, sy, PLATE, PLATE),
            "BL": box(0, 0, sx, sy), "BR": box(sx, 0, PLATE, sy)}


def glyphs():
    """{(row, col): (letter, outline placed on the plate)}"""
    data = json.loads(LETTERS.read_text())["glyphs"]
    out = {}
    for key, g in data.items():
        r, c = (int(v) for v in key.split(","))
        out[r, c] = (g["ch"], translate(Polygon(g["ring"]), col_x[c], row_y[r]))
    assert len(out) == COLS * ROWS
    return out


def openings():
    """Everything that lights up: 110 letters and 4 dots."""
    dots = [Point(x, y).buffer(DOT_D / 2, 32) for x, y in DOTS.values()]
    return unary_union([p for _, p in glyphs().values()] + dots)


# ------------------------------------------------------------------- meshes
def extrude(shape, height, z=0.0):
    shape = shape.simplify(1e-9)    # drop collinear points, they break the mesh
    polys = getattr(shape, "geoms", [shape])
    mesh = trimesh.util.concatenate(
        [trimesh.creation.extrude_polygon(p, height, engine="manifold")
         for p in polys if p.area > 1e-6])
    mesh.apply_translation((0, 0, z))
    return mesh


def faceplate(rect, lit):
    """Black plate with the openings cut through, and the white skin that fills
    the first INLAY_T of every opening."""
    return extrude(rect.difference(lit), FACE_T), extrude(rect.intersection(lit), INLAY_T)


def grid_walls():
    """Top view of the grid: rim, cell walls, and the walls carried on through
    the border as ribs."""
    xs = [RIM_T] + wall_x + [PLATE - RIM_T]
    ys = [RIM_T] + wall_y + [PLATE - RIM_T]
    hx = [0] + [WALL_T / 2] * len(wall_x) + [0]
    hy = [0] + [WALL_T / 2] * len(wall_y) + [0]
    voids = [box(xs[i] + hx[i], ys[j] + hy[j], xs[i + 1] - hx[i + 1], ys[j + 1] - hy[j + 1])
             for i in range(len(xs) - 1) for j in range(len(ys) - 1)]
    return box(0, 0, PLATE, PLATE).difference(unary_union(voids))


def grid_notches():
    """Cut-outs on the LED side, as (shape, depth)."""
    out = []
    for i, x in enumerate(wall_x):          # the strip passes under every wall
        end = i in (0, len(wall_x) - 1)     # deeper at the ends: solder joints
        for y in row_y:
            out.append((box(x - WALL_T, y - STRIP_W / 2, x + WALL_T, y + STRIP_W / 2),
                        WIRE_H if end else STRIP_H))
    for y in wall_y[1:-1]:                  # row-to-row jumpers, at both ends
        for x in (wall_x[0] + WALL_T / 2 + WIRE_W / 2, wall_x[-1] - WALL_T / 2 - WIRE_W / 2):
            out.append((box(x - WIRE_W / 2, y - WALL_T, x + WIRE_W / 2, y + WALL_T), WIRE_H))
    for m in (MID, PLATE - MID):            # wire channel all round the border
        for y in wall_y:
            out.append((box(m - WIRE_W / 2, y - WALL_T, m + WIRE_W / 2, y + WALL_T), WIRE_H))
        for x in wall_x:
            out.append((box(x - WALL_T, m - WIRE_W / 2, x + WALL_T, m + WIRE_W / 2), WIRE_H))
    return out


def lightgrid(rect, walls, notches):
    body = extrude(walls.intersection(rect), WALL_H)
    cutters = [extrude(s.intersection(rect), d + 1, WALL_H - d)
               for s, d in notches if s.intersection(rect).area > 1e-6]
    return trimesh.boolean.difference([body, trimesh.util.concatenate(cutters)], engine="manifold")


def for_printing(mesh, origin=None):
    """Mirror left-right so the front lies on the bed. Tile names stay as seen
    from the front."""
    m = mesh.copy()
    m.apply_transform([[-1, 0, 0, PLATE], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
    if origin is not None:
        m.apply_translation(-np.asarray(origin))
    return m


def build():
    lit, walls, notches = openings(), grid_walls(), grid_notches()
    parts = {}
    for name, rect in tiles(FACE_SEAM).items():
        black, white = faceplate(rect, lit)
        parts[f"faceplate_{name}"] = for_printing(black)
        parts[f"faceplate_{name}_letters"] = for_printing(white)
    for name, rect in tiles(GRID_SEAM).items():
        parts[f"lightgrid_{name}"] = for_printing(lightgrid(rect, walls, notches))
    # the sample: the real top-right corner, J F / O R and one dot
    black, white = faceplate(SAMPLE, lit)
    corner = for_printing(black).bounds[0]
    parts["sample_faceplate"] = for_printing(black, corner)
    parts["sample_faceplate_letters"] = for_printing(white, corner)
    parts["sample_lightgrid"] = for_printing(lightgrid(SAMPLE, walls, notches), corner)
    return parts


# -------------------------------------------------------------------- checks
def fits(mesh, two_colour):
    x, y = sorted(mesh.extents[:2])
    if two_colour:      # long side along the bed's Y, tower beside it in X
        return x + TOWER <= BED_TWO[0] and y <= BED_TWO[1]
    return x + 2 * BRIM <= BED_ONE[0] and y + 2 * BRIM <= BED_ONE[1]


def bed_side(mesh):
    """Outline of what touches the build plate, turned back to the front view."""
    tri = mesh.triangles
    down = np.all(np.isclose(tri[:, :, 2], 0, atol=1e-6), axis=1) & (mesh.face_normals[:, 2] < -0.99)
    shape = unary_union([Polygon(t[:, :2]) for t in tri[down]])
    return translate(scale(shape, xfact=-1, origin=(0, 0)), xoff=PLATE)


def check():
    meshes = {p.stem: trimesh.load_mesh(p) for p in sorted(OUT.glob("*.stl"))}
    assert len(meshes) == 15, sorted(meshes)
    for name, m in meshes.items():
        assert m.is_watertight and m.is_winding_consistent and m.volume > 0, name
        assert abs(m.bounds[0, 2]) < 1e-6, f"{name} does not sit on the bed"
        assert fits(m, name.startswith(("faceplate", "sample_faceplate"))), f"{name} is too big"
        if not name.endswith("_letters"):
            assert len(m.split()) == 1, f"{name} is in loose pieces"

    lit, plate = openings(), box(0, 0, PLATE, PLATE)
    black = unary_union([bed_side(m) for n, m in meshes.items()
                         if n.startswith("faceplate") and not n.endswith("_letters")])
    white = unary_union([bed_side(m) for n, m in meshes.items()
                         if n.startswith("faceplate") and n.endswith("_letters")])
    assert black.symmetric_difference(plate.difference(lit)).area < 0.1, "front is mirrored or incomplete"
    assert white.symmetric_difference(lit).area < 0.1, "white letters do not fill the openings"

    walls = unary_union([bed_side(m) for n, m in meshes.items() if n.startswith("lightgrid")])
    assert walls.intersection(lit).area < 1e-6, "a wall crosses a letter or dot"
    assert walls.symmetric_difference(grid_walls()).area < 1.0, "grid outline is wrong"

    for name, m in meshes.items():          # names are positions seen from the front
        if name.startswith("sample"):
            continue
        x0, y0, x1, y1 = bed_side(m).bounds
        tile = name.split("_")[1]
        assert ((x0 + x1) / 2 < PLATE / 2) == (tile[1] == "L"), name
        assert ((y0 + y1) / 2 > PLATE / 2) == (tile[0] == "T"), name

    def path(poly):
        return " ".join("M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in ring.coords) + "Z"
                        for ring in [poly.exterior, *poly.interiors])

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PLATE:g} {PLATE:g}">'
           '<title>QLOCK front, drawn from the print files</title>'
           f'<rect width="{PLATE:g}" height="{PLATE:g}" fill="#1b1a18"/>'
           f'<g transform="translate(0,{PLATE:g}) scale(1,-1)" fill="#f4efe6">'
           + "".join(f'<path d="{path(p)}"/>' for p in getattr(white, "geoms", [white]))
           + "</g></svg>\n")
    (OUT / "preview.svg").write_text(svg)
    return meshes


def main():
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.stl"):
        old.unlink()
    for name, mesh in build().items():
        mesh.export(OUT / f"{name}.stl")
    meshes = check()

    print(f"{'file':<28} {'X':>6} {'Y':>6} {'Z':>5}  {'PLA':>5}")
    grams = {"black": 0.0, "white": 0.0}
    for name, m in meshes.items():
        g = m.volume / 1000 * 1.24
        white = name.startswith(("lightgrid", "sample_lightgrid")) or name.endswith("_letters")
        if not name.startswith("sample"):
            grams["white" if white else "black"] += g
        x, y, z = m.extents
        print(f"{name:<28} {x:6.1f} {y:6.1f} {z:5.1f}  {g:4.0f} g")
    print(f"\nclock without samples: {grams['black']:.0f} g black, {grams['white']:.0f} g white")
    print("all checks passed: solid, fits the H2D, front reads correctly, white fills every "
          "letter,\nno wall crosses a letter, tile names match. Preview: stl/preview.svg")


if __name__ == "__main__":
    main()
