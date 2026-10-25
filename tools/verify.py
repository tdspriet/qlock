#!/usr/bin/env python3
"""Check exported meshes, including lettering as seen from the smooth front.

Run after qlock.py: python tools/verify.py
"""
import argparse
import json
from pathlib import Path

import numpy as np
import trimesh
from shapely.affinity import scale, translate
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

import qlock as q


def flat_surface(mesh, z, normal):
    triangles = mesh.triangles
    selected = np.all(np.isclose(triangles[:, :, 2], z), axis=1)
    selected &= mesh.face_normals[:, 2] * normal > 0.99
    return unary_union([Polygon(t[:, :2]) for t in triangles[selected]])


def from_front(shape):
    return translate(scale(shape, xfact=-1, yfact=1, origin=(0, 0)), xoff=q.PLATE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cura-resources', type=Path,
                        help='Cura resources folder containing definitions/ and extruders/')
    args = parser.parse_args()
    meshes = {}
    for path in sorted(q.OUT.rglob('*.stl')):
        mesh = trimesh.load_mesh(path)
        assert mesh.is_watertight and mesh.is_winding_consistent, path
        assert mesh.volume > 0 and abs(mesh.bounds[0, 2]) < 1e-5, path
        assert max(mesh.extents[:2]) + 2 * q.BRIM <= q.BED, path
        expected_bodies = 10 if path.stem == 'splines_x10' else 1
        assert len(mesh.split()) == expected_bodies, path
        meshes[str(path.relative_to(q.OUT).with_suffix(''))] = mesh
    assert len(meshes) == 12

    # Compare the physical bed-facing surface against independently positioned
    # reference glyphs. The old, unmirrored exports fail this check.
    glyphs = json.loads(q.LETTERS.read_text())['glyphs']
    expected_letters = unary_union([
        translate(Polygon(g['ring']), q.col_x[int(key.split(',')[1])],
                  q.row_y[int(key.split(',')[0])])
        for key, g in glyphs.items()
    ])
    face = unary_union([from_front(flat_surface(m, 0, -1))
                        for n, m in meshes.items() if n.startswith('faceplate_')])
    expected_face = box(0, 0, q.PLATE, q.PLATE).difference(expected_letters)
    assert face.symmetric_difference(expected_face).area < 0.1, 'Front is mirrored or incomplete'

    # Confirm the pockets are on the back, with intact thin floors at the front.
    rear = unary_union([from_front(flat_surface(m, q.FACE_T, 1))
                        for n, m in meshes.items() if n.startswith('faceplate_')])
    pockets = unary_union(q.spline_pockets())
    assert rear.symmetric_difference(expected_face.difference(pockets)).area < 0.1
    assert pockets.intersection(expected_letters).area < 1e-5
    grid = unary_union([from_front(flat_surface(m, 0, -1))
                        for n, m in meshes.items() if n.startswith('lightgrid_')])
    assert grid.intersection(expected_letters).area < 1e-5, 'Wall obscures a letter'
    for key, g in glyphs.items():
        r, c = map(int, key.split(','))
        cell = box(q.col_x[c] - q.COL_PITCH / 2 + q.WALL_T / 2,
                   q.row_y[r] - q.ROW_PITCH / 2 + q.WALL_T / 2,
                   q.col_x[c] + q.COL_PITCH / 2 - q.WALL_T / 2,
                   q.row_y[r] + q.ROW_PITCH / 2 - q.WALL_T / 2)
        assert cell.contains(translate(Polygon(g['ring']), q.col_x[c], q.row_y[r]))

    # Tile names remain front-view positions after the export transformation.
    for name, mesh in meshes.items():
        if not name.startswith(('faceplate_', 'lightgrid_')):
            continue
        centre = from_front(box(*mesh.bounds[:, :2].flatten())).centroid
        tile = name.rsplit('_', 1)[1]
        assert (centre.x < q.PLATE / 2) == (tile[1] == 'L'), name
        assert (centre.y > q.PLATE / 2) == (tile[0] == 'T'), name

    # Save a preview from the actual STL surfaces, not just the source outlines.
    polygons = list(face.geoms) if hasattr(face, 'geoms') else [face]
    paths = []
    for polygon in polygons:
        rings = [polygon.exterior, *polygon.interiors]
        paths.append(' '.join('M ' + ' L '.join(f'{x:.4f},{y:.4f}' for x, y in ring.coords) + ' Z'
                              for ring in rings))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 386 386">'
           '<title>QLOCK: smooth front, verified from exported STLs</title>'
           '<rect x="-5" y="-5" width="386" height="386" fill="white"/>'
           '<g transform="translate(0,376) scale(1,-1)" fill="#222" fill-rule="evenodd">'
           + ''.join(f'<path d="{p}"/>' for p in paths) + '</g></svg>')
    (q.ROOT / 'reference/front-preview.svg').write_text(svg)
    print('PASS: 12 valid STLs; expected connected bodies; nominal bed dimensions including 1.2 mm brim.')
    print('PASS: readable smooth front; rear pockets; all 110 glyphs clear their cells; tile labels.')
    print('Preview: reference/front-preview.svg')
    if args.cura_resources:
        definition = json.loads((args.cura_resources / 'definitions/ultimaker3.def.json').read_text())
        left = json.loads((args.cura_resources / 'extruders/ultimaker3_extruder_left.def.json').read_text())
        right = json.loads((args.cura_resources / 'extruders/ultimaker3_extruder_right.def.json').read_text())
        overrides = definition['overrides']
        width = overrides['machine_width']['default_value']
        depth = overrides['machine_depth']['default_value']
        offset = right['overrides']['machine_nozzle_offset_x']['default_value']
        bed = box(-width / 2, -depth / 2, width / 2 - offset, depth / 2)
        prime_x = left['overrides']['extruder_prime_pos_x']['default_value'] - width / 2
        prime_y = depth / 2 - left['overrides']['extruder_prime_pos_y']['default_value']
        excluded = unary_union([
            *[Polygon(p) for p in overrides['machine_disallowed_areas']['default_value']],
            Point(prime_x, prime_y).buffer(6.5),  # Cura 5.13 BuildVolume.PRIME_CLEARANCE
        ])
        for name, mesh in meshes.items():
            x, y = mesh.extents[:2]
            # README Move X=-12,Y=-1 (default, unflipped UI); include 0.2 mm allowance.
            pad = q.BRIM + 0.2
            footprint = box(-12-x/2-pad, -1-y/2-pad, -12+x/2+pad, -1+y/2+pad)
            assert bed.contains(footprint) and not footprint.intersects(excluded), name
        print('PASS: stock UM3 left-extruder reach, clip keep-outs and prime blob; 1.2 mm brim at X=-12,Y=-1.')


if __name__ == '__main__':
    main()
