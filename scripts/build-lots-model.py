"""Build the fortune-lots (求签) props with Blender and export one GLB.

Run after build-lots-textures.py, either with Blender:
    blender -b -P scripts/build-lots-model.py
or with the `bpy` Python module (Python 3.11):  python scripts/build-lots-model.py

Objects (names are read by app/tarot-fortune/FortuneScene.tsx), units in metres, Y up in glTF:
    CUP_OUTER / CUP_INNER / CUP_RIM  lacquered tube, outer R .26, inner R .22, height .72, floor top .06
    STICK                            flat bamboo slat 1.0 x .045 x .01, origin at its centre
    TABLE                            2.4 x 2.4 plank top, top surface at y = 0
Keep these dimensions in sync with the colliders in FortuneScene.tsx.
"""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / 'tools' / 'lots-textures'
OUT = ROOT / 'public' / 'assets' / 'fortune-lots.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)

R_OUT, R_IN, H, FLOOR = .26, .22, .72, .06
STICK_L, STICK_W, STICK_T = 1.0, .045, .01


def material(name, color=None, normal=None, base=(1, 1, 1), roughness=.5, normal_strength=1.0, clearcoat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*base, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if clearcoat and 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = clearcoat
        bsdf.inputs['Coat Roughness'].default_value = .18
    if color:
        img = nt.nodes.new('ShaderNodeTexImage')
        img.image = bpy.data.images.load(str(TEX / color))
        nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
    if normal:
        img = nt.nodes.new('ShaderNodeTexImage')
        img.image = bpy.data.images.load(str(TEX / normal))
        img.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(img.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def finish(obj, mat, split_angle=40):
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mod = obj.modifiers.new('crisp edges', 'EDGE_SPLIT')
    mod.split_angle = math.radians(split_angle)
    return obj


def lathe(name, profile, mat, segments=96, v_span=H):
    """Revolve (radius, height) points. UV u wraps the circumference with the seam at the back
    (-Z in glTF), v = height / v_span."""
    cols = segments + 1
    verts, faces, uvs = [], [], []
    for r, z in profile:
        for i in range(cols):
            a = 2 * math.pi * i / segments + math.pi / 2
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for row in range(len(profile) - 1):
        for i in range(segments):
            a, b = row * cols + i, row * cols + i + 1
            faces.append((a, b, b + cols, a + cols))
            uvs.append([(i / segments, profile[row][1] / v_span), ((i + 1) / segments, profile[row][1] / v_span),
                        ((i + 1) / segments, profile[row + 1][1] / v_span), (i / segments, profile[row + 1][1] / v_span)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name='UVMap')
    for poly, quad in zip(mesh.polygons, uvs):
        for loop, uv in zip(poly.loop_indices, quad):
            layer.data[loop].uv = uv
    # The seam column is duplicated on purpose so u can wrap 0..1 without a UV jump.
    return finish(bpy.data.objects.new(name, mesh), mat)


lacquer = material('lacquered tube', 'cup-color.jpg', 'cup-normal.jpg', roughness=.32, normal_strength=.6, clearcoat=.6)
inner = material('tube interior', base=(.055, .022, .014), roughness=.8)
rim = material('tube rim end grain', base=(.13, .05, .028), roughness=.55)
bamboo = material('bamboo slat', 'stick-color.jpg', 'stick-normal.jpg', roughness=.55, normal_strength=.5)
table = material('temple table', 'table-color.jpg', 'table-normal.jpg', roughness=.42, normal_strength=.7)

# Outer wall: small foot ring, slight waist, flared lip.
lathe('CUP_OUTER', [
    (0, 0), (R_OUT - .012, 0), (R_OUT + .004, .008), (R_OUT + .006, .03), (R_OUT - .002, .045),
    (R_OUT - .006, .16), (R_OUT - .008, .38), (R_OUT - .004, .6), (R_OUT + .004, .675), (R_OUT + .008, .705), (R_OUT + .006, H),
], lacquer)
lathe('CUP_RIM', [(R_OUT + .006, H), (R_OUT - .004, H + .006), (R_IN + .006, H + .006), (R_IN, H)], rim)
lathe('CUP_INNER', [(R_IN, H), (R_IN, FLOOR + .01), (R_IN - .012, FLOOR), (0, FLOOR)], inner)


def stick():
    """Flat slat, rounded head, length along Blender Z, width X, thickness Y."""
    half_l, half_w, half_t = STICK_L / 2, STICK_W / 2, STICK_T / 2
    shoulder = half_l - half_w
    outline = [(-half_w, -half_l), (half_w, -half_l)]
    outline += [(half_w * math.cos(a), shoulder + half_w * math.sin(a))
                for a in (k * math.pi / 10 for k in range(0, 11))]
    n = len(outline)
    verts = [(x, -half_t, z) for x, z in outline] + [(x, half_t, z) for x, z in outline]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    faces += [(i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n)]
    mesh = bpy.data.meshes.new('STICK')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for loop in poly.loop_indices:
            co = mesh.vertices[mesh.loops[loop].vertex_index].co
            layer.data[loop].uv = (co.x / STICK_W + .5, co.z / STICK_L + .5)
    obj = bpy.data.objects.new('STICK', mesh)
    bev = obj.modifiers.new('eased edges', 'BEVEL')
    bev.width = .0018
    bev.segments = 2
    return finish(obj, bamboo, 50)


stick()

bpy.ops.mesh.primitive_plane_add(size=2.4, location=(0, 0, 0))
top = bpy.context.active_object
top.name = 'TABLE'
top.data.name = 'TABLE'
top.data.materials.append(table)

bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_apply=True,
                          export_image_format='AUTO', export_yup=True)
print('LOTS_MODEL_READY', OUT, OUT.stat().st_size)
