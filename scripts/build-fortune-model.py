"""Build a carved, varnished wooden kau cim tube and flat bamboo sticks."""
import bpy
import math
import tempfile
from pathlib import Path

OUTPUT = Path('E:/web idea/public/assets')
TEMP = Path('E:/web idea/tools/blender-export-temp')
TEMP.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(TEMP)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def pbr(name, texture_prefix, roughness=.35):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    nodes = item.node_tree.nodes
    links = item.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = roughness
    color = nodes.new('ShaderNodeTexImage')
    color.image = bpy.data.images.load(str(OUTPUT / f'{texture_prefix}-color.png'))
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    rough = nodes.new('ShaderNodeTexImage')
    rough.image = bpy.data.images.load(str(OUTPUT / f'{texture_prefix}-roughness.png'))
    rough.image.colorspace_settings.name = 'Non-Color'
    links.new(rough.outputs['Color'], shader.inputs['Roughness'])
    normal = nodes.new('ShaderNodeTexImage')
    normal.image = bpy.data.images.load(str(OUTPUT / f'{texture_prefix}-normal.png'))
    normal.image.colorspace_settings.name = 'Non-Color'
    normal_node = nodes.new('ShaderNodeNormalMap')
    normal_node.inputs['Strength'].default_value = .42
    links.new(normal.outputs['Color'], normal_node.inputs['Color'])
    links.new(normal_node.outputs['Normal'], shader.inputs['Normal'])
    return item

def solid(name, color, roughness=.45):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, 1)
    item.use_nodes = True
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return item

varnished_wood = pbr('varnished amber wood, carved bagua', 'fortune-wood')
rim_wood = solid('dark exposed end grain', (.19, .065, .025), .42)
inner_wood = solid('interior unpolished wood', (.20, .073, .028), .66)
groove = solid('turned grooves, dark wood', (.115, .034, .013), .61)
bamboo = pbr('natural flat bamboo', 'fortune-bamboo', .64)

def lathe(name, profile, material, segments=112, bevel=.002):
    verts = []
    faces = []
    for radius, height in profile:
        for i in range(segments):
            angle = i * 2 * math.pi / segments
            verts.append((radius*math.cos(angle), radius*math.sin(angle), height))
    for row in range(len(profile)-1):
        for i in range(segments):
            j = (i+1) % segments
            faces.append((row*segments+i,row*segments+j,(row+1)*segments+j,(row+1)*segments+i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for row in range(len(profile)-1):
        for i in range(segments):
            polygon = mesh.polygons[row*segments+i]
            x0, x1 = i/segments, (i+1)/segments
            y0, y1 = profile[row][1]/1.42, profile[row+1][1]/1.42
            for loop, value in zip(polygon.loop_indices, ((x0,y0),(x1,y0),(x1,y1),(x0,y1))):
                uv.data[loop].uv = value
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = True
    if bevel:
        mod = obj.modifiers.new('soft lathe edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    obj.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
    return obj

# Straight polished cylinder. The stepped opening, dark interior and turned
# grooves are separate geometry, so they survive glTF export and side views.
lathe('FORTUNE_CUP', [
    (0,.025),(.296,.025),(.315,.046),(.318,.103),(.311,.123),
    (.307,.145),(.307,.184),(.311,.205),(.310,.222),
    (.308,.29),(.308,1.080),(.314,1.102),(.312,1.122),
    (.306,1.143),(.306,1.178),(.313,1.201),(.318,1.225),
    (.318,1.340),(.310,1.365),(.272,1.365),(.266,1.33),
    (.263,1.08),(.257,.23),(.260,.105),(0,.105)
], varnished_wood, bevel=.004)
lathe('CUP_INNER', [(.26,.105),(.257,.25),(.263,1.08),(.27,1.34)], inner_wood)
lathe('RIM_END_GRAIN', [(.272,1.363),(.310,1.363),(.316,1.373),(.310,1.384),(.270,1.384)], rim_wood, bevel=.004)
lathe('INNER_RIM_HIGHLIGHT', [(.270,1.36),(.276,1.36),(.279,1.373),(.270,1.375)], varnished_wood)
lathe('TOP_TURNED_GROOVE', [(.306,1.185),(.309,1.185),(.309,1.197),(.306,1.197)], groove)
lathe('TOP_TURNED_GROOVE_2', [(.305,1.133),(.309,1.133),(.309,1.141),(.305,1.141)], groove)
lathe('BOTTOM_TURNED_GROOVE', [(.307,.173),(.312,.173),(.312,.185),(.307,.185)], groove)
lathe('BOTTOM_TURNED_GROOVE_2', [(.309,.105),(.315,.105),(.315,.113),(.309,.113)], groove)

def flat_stick():
    # A paddle silhouette with a domed head and a bevel all around.
    width = .046
    depth = .012
    shoulder = 1.52
    outline = [(-width/2,0),(width/2,0),(width/2,shoulder)]
    for i in range(1,9):
        a = i * math.pi/8
        outline.append((math.cos(a)*width/2, shoulder + math.sin(a)*.045))
    outline.append((-width/2,shoulder))
    n = len(outline)
    verts = [(x,-depth/2,z) for x,z in outline] + [(x,depth/2,z) for x,z in outline]
    faces = [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    for i in range(n):
        j=(i+1)%n
        faces.append((i,j,j+n,i+n))
    mesh=bpy.data.meshes.new('flat bamboo signature')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        for loop_index in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[loop_index].vertex_index]
            uv.data[loop_index].uv=((vertex.co.x/width)+.5, vertex.co.z/1.57)
    obj=bpy.data.objects.new('STICK_BODY',mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bamboo)
    bevel=obj.modifiers.new('rounded bamboo edge','BEVEL')
    bevel.width=.0035
    bevel.segments=2
    obj.modifiers.new('weighted normals','WEIGHTED_NORMAL')

flat_stick()

# Keep the real reference's height while giving the vessel a broader, heavier
# silhouette. The signature itself remains the same physical size.
for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name != 'STICK_BODY':
        obj.scale.x = 1.32
        obj.scale.y = 1.32

bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'fortune-stick-props.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'fortune-stick-props.glb'),export_format='GLB',export_apply=True)
print('FORTUNE_MODEL_READY')
