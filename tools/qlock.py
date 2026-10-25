#!/usr/bin/env python3
"""
Generate every 3D-printable part of the QLOCK.

The 110 letter outlines live in reference/letters.json - already bridged so
nothing falls out, each one centred on the origin. Everything else is driven
by the CONFIG block below. Change a number, re-run, get new STLs.

    python3 tools/qlock.py

Requires: shapely trimesh manifold3d mapbox_earcut
"""
import json
from pathlib import Path

import trimesh
from shapely.affinity import translate
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
LETTERS = ROOT / "reference" / "letters.json"
OUT = ROOT / "stl"

# --------------------------------------------------------------------------
# CONFIG - all dimensions in mm
# --------------------------------------------------------------------------
COLS, ROWS = 11, 10

PLATE = 376.0              # outer size of the finished square faceplate
COL_PITCH = 1000.0 / 30.0  # 33.333 - locked to a 30 LED/m WS2812B strip
ROW_PITCH = 35.0

FACE_T = 2.5               # faceplate thickness

WALL_T = 1.6               # light-box wall thickness
WALL_H = 18.0              # faceplate to LED strip
RIM_T = 4.0                # outer rim of the light grid - this is the glue land
SLOT_W = 12.0              # rear notch in vertical walls, the strip threads through
SLOT_H = 3.5
WIRE_W = 6.0               # rear notch in horizontal walls for the jumper wires

POCKET_L, POCKET_W, POCKET_D = 30.0, 8.0, 1.2   # spline pockets, faceplate back
SPLINE_T = 1.0
SPLINE_CLEAR = 0.3

BED = 215.0                # Ultimaker 3 build plate, single extrusion
BRIM = 1.2                 # 3 lines at 0.4 mm; see README for UM3 placement

# Design coordinates: looking at the FRONT, origin bottom-left. Export mirrors
# X for face-down printing, with the spline pockets and rear wire slots up.
MARGIN_X = (PLATE - (COLS - 1) * COL_PITCH) / 2
MARGIN_Y = (PLATE - (ROWS - 1) * ROW_PITCH) / 2
col_x = [MARGIN_X + i * COL_PITCH for i in range(COLS)]
row_y = [PLATE - MARGIN_Y - r * ROW_PITCH for r in range(ROWS)]   # row 0 = top

# Seams. The faceplate splits between letter columns 5|6, the light grid
# between 6|7, so the grid straddles the faceplate's vertical joint.
SEAM_X = MARGIN_X + 4.5 * COL_PITCH          # 171.33
SEAM_Y = PLATE - MARGIN_Y - 4.5 * ROW_PITCH  # 188.00
GRID_SEAM_X = MARGIN_X + 5.5 * COL_PITCH     # 204.67


def letter_field():
    """All 110 letters, positioned on the plate, as one MultiPolygon."""
    data = json.loads(LETTERS.read_text())["glyphs"]
    placed = []
    for key, g in data.items():
        r, c = (int(v) for v in key.split(","))
        poly = Polygon(g["ring"])
        assert not poly.interiors, f"{g['ch']} at {key} would drop its middle out"
        placed.append(translate(poly, col_x[c], row_y[r]))
    assert len(placed) == COLS * ROWS
    return unary_union(placed)


# --------------------------------------------------------------------------
# Meshes
# --------------------------------------------------------------------------
def extrude(poly, height, z=0.0):
    m = trimesh.creation.extrude_polygon(poly, height)
    if z:
        m.apply_translation((0, 0, z))
    return m


def prism(poly, rect, height, z=0.0):
    """Clip a 2D shape to a tile and extrude it, or None if nothing is left."""
    clipped = poly.intersection(rect)
    if clipped.is_empty or clipped.area < 1e-6:
        return None
    if clipped.geom_type == "MultiPolygon":
        return trimesh.util.concatenate(
            [extrude(g, height, z) for g in clipped.geoms if g.area > 1e-6])
    return extrude(clipped, height, z)


def cut(solid, cutters):
    """Subtract a pile of simple prisms in one go. Disjoint watertight meshes
    concatenate into a single valid volume, which keeps manifold happy and
    avoids triangulating one face with a hundred holes in it."""
    cutters = [c for c in cutters if c is not None and c.volume > 1e-6]
    if not cutters:
        return solid
    return trimesh.boolean.difference(
        [solid, trimesh.util.concatenate(cutters)], engine="manifold")


def spline_pockets():
    """Pockets straddling each seam, on the back of the faceplate. They sit in
    the blank gaps between letters, never over one."""
    gap_y = [(row_y[r] + row_y[r + 1]) / 2 for r in range(ROWS - 1)]
    gap_x = [(col_x[c] + col_x[c + 1]) / 2 for c in range(COLS - 1)]
    out = []
    for y in (gap_y[7], gap_y[5], gap_y[3], gap_y[1]):        # across the vertical seam
        out.append(box(SEAM_X - POCKET_L / 2, y - POCKET_W / 2,
                       SEAM_X + POCKET_L / 2, y + POCKET_W / 2))
    for x in (gap_x[1], gap_x[3], gap_x[6], gap_x[8]):        # across the horizontal seam
        out.append(box(x - POCKET_W / 2, SEAM_Y - POCKET_L / 2,
                       x + POCKET_W / 2, SEAM_Y + POCKET_L / 2))
    return out


def build_faceplates(letters):
    pockets = spline_pockets()
    tiles = {
        "BL": box(0, 0, SEAM_X, SEAM_Y),
        "BR": box(SEAM_X, 0, PLATE, SEAM_Y),
        "TL": box(0, SEAM_Y, SEAM_X, PLATE),
        "TR": box(SEAM_X, SEAM_Y, PLATE, PLATE),
    }
    for name, rect in tiles.items():
        body = extrude(rect, FACE_T)
        body = cut(body, [prism(g, rect, FACE_T + 2, z=-1) for g in letters.geoms])
        body = cut(body, [prism(p, rect, POCKET_D + 1, z=FACE_T - POCKET_D)
                          for p in pockets])
        yield f"faceplate_{name}", body


def wall_lines():
    """Every cell boundary, including the two outer ones. Sitting them half a
    pitch outside the outer letters makes all 110 cells the same size with the
    LED dead centre - otherwise the top and bottom rows get an oversized box
    and an off-centre light."""
    bx = ([col_x[0] - COL_PITCH / 2]
          + [(col_x[c] + col_x[c + 1]) / 2 for c in range(COLS - 1)]
          + [col_x[-1] + COL_PITCH / 2])
    by = ([row_y[-1] - ROW_PITCH / 2]
          + [(row_y[r] + row_y[r + 1]) / 2 for r in range(ROWS - 1)][::-1]
          + [row_y[0] + ROW_PITCH / 2])
    return bx, by


def build_grids():
    bx, by = wall_lines()
    tiles = {
        "BL": box(0, 0, GRID_SEAM_X, SEAM_Y),
        "BR": box(GRID_SEAM_X, 0, PLATE, SEAM_Y),
        "TL": box(0, SEAM_Y, GRID_SEAM_X, PLATE),
        "TR": box(GRID_SEAM_X, SEAM_Y, PLATE, PLATE),
    }
    for name, rect in tiles.items():
        body = extrude(rect, WALL_H)

        # everything inside the rim that isn't a wall gets removed. The margin
        # strips only exist where the outer wall doesn't already merge into the
        # rim - box() silently flips a reversed rectangle, which would saw a
        # hairline slot through the rim and detach it.
        def strip(x0, y0, x1, y1):
            return [box(x0, y0, x1, y1)] if x1 - x0 > 1e-9 and y1 - y0 > 1e-9 else []

        voids = (strip(RIM_T, RIM_T, bx[0] - WALL_T / 2, PLATE - RIM_T)
                 + strip(bx[-1] + WALL_T / 2, RIM_T, PLATE - RIM_T, PLATE - RIM_T)
                 + strip(RIM_T, RIM_T, PLATE - RIM_T, by[0] - WALL_T / 2)
                 + strip(RIM_T, by[-1] + WALL_T / 2, PLATE - RIM_T, PLATE - RIM_T))
        for i in range(COLS):
            for j in range(ROWS):
                voids.append(box(bx[i] + WALL_T / 2, by[j] + WALL_T / 2,
                                 bx[i + 1] - WALL_T / 2, by[j + 1] - WALL_T / 2))
        body = cut(body, [prism(v, rect, WALL_H + 2, z=-1) for v in voids])

        notches, z = [], WALL_H - SLOT_H
        for x in bx:                        # LED strip threads through every
            for yc in row_y:                # vertical wall, including the outer two
                notches.append(prism(box(x - WALL_T, yc - SLOT_W / 2,
                                         x + WALL_T, yc + SLOT_W / 2),
                                     rect, SLOT_H + 1, z=z))
        # jumper wires hop rows hard against the outer walls, right where the
        # strip ends and its solder pads are - not under the edge LEDs, or the
        # wires would cut diagonally across the back of every edge cell
        for y in by:
            for xc in (bx[0] + WALL_T / 2 + WIRE_W / 2, bx[-1] - WALL_T / 2 - WIRE_W / 2):
                notches.append(prism(box(xc - WIRE_W / 2, y - WALL_T,
                                         xc + WIRE_W / 2, y + WALL_T),
                                     rect, SLOT_H + 1, z=z))
        body = cut(body, notches)
        yield f"lightgrid_{name}", body


def build_splines():
    l = POCKET_L - 2 * SPLINE_CLEAR
    w = POCKET_W - 2 * SPLINE_CLEAR
    parts = []
    for i in range(10):                     # 8 needed, 10 printed
        m = extrude(box(0, 0, l, w), SPLINE_T)
        m.apply_translation((0, i * (w + 4), 0))
        parts.append(m)
    yield "splines_x10", trimesh.util.concatenate(parts)


def print_orientation(mesh):
    """Front-view design -> bed-facing front; preserve front-view tile names."""
    result = mesh.copy()
    result.apply_transform([
        [-1, 0, 0, PLATE],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
    ])
    return result


def build_test_pieces(parts):
    """Crop four real cells (JF / OR), including the outer rim and wire slot."""
    bx, by = wall_lines()
    rect = box(bx[-3] - WALL_T / 2, by[-3] - WALL_T / 2, PLATE, PLATE)
    clip = extrude(rect, WALL_H + 2, z=-1)
    for kind in ("faceplate", "lightgrid"):
        mesh = trimesh.boolean.intersection(
            [parts[f"{kind}_TR"], clip], engine="manifold")
        mesh = print_orientation(mesh)
        mesh.apply_translation(-mesh.bounds[0])
        yield f"test/{kind}_sample", mesh
    # Match the thinnest material left underneath a spline pocket.
    yield "test/opacity_sample", extrude(box(0, 0, 25, 25), FACE_T - POCKET_D)


# --------------------------------------------------------------------------
def main():
    OUT.mkdir(exist_ok=True)
    letters = letter_field()
    print(f"letter field: {len(letters.geoms)} openings\n")

    design = dict([*build_faceplates(letters), *build_grids()])
    parts = [(name, print_orientation(mesh)) for name, mesh in design.items()]
    parts.extend(build_splines())
    parts.extend(build_test_pieces(design))
    rows = []
    for name, mesh in parts:
        assert mesh.is_watertight and mesh.is_winding_consistent and mesh.volume > 0, name
        target = OUT / f"{name}.stl"
        target.parent.mkdir(exist_ok=True)
        mesh.export(target)
        x, y, z = mesh.extents
        rows.append((name, x, y, z, mesh.volume / 1000,
                     "ok" if max(x, y) + 2 * BRIM <= BED else "TOO BIG"))

    w = max(len(r[0]) for r in rows)
    print(f"{'part':<{w}}  {'X':>7} {'Y':>7} {'Z':>6}  {'cm3':>7}  {'PLA g':>6}  bed")
    for n, x, y, z, v, fit in rows:
        print(f"{n:<{w}}  {x:7.1f} {y:7.1f} {z:6.1f}  {v:7.1f}  {v*1.24:6.0f}  {fit}")
    tot = sum(r[4] for r in rows)
    print(f"\ntotal {tot:.0f} cm3 = {tot*1.24:.0f} g PLA. These parts are thin "
          f"enough that\ninfill barely matters - expect close to the full figure.")


if __name__ == "__main__":
    main()
