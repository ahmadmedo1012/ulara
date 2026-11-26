# Procedural modernist concrete building, orthographic elevation, Cycles CPU.
# Run: blender -b -P hero.py -- out.png W H samples
import bpy, sys, math, random
a = sys.argv[sys.argv.index('--')+1:]
out, W, H, S = a[0], int(a[1]), int(a[2]), int(a[3])
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = S
sc.cycles.use_denoising = True; sc.render.film_transparent = True; sc.render.image_settings.color_mode='RGBA'
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.filepath = out
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.92,0.92,0.9,1); bg.inputs[1].default_value = 0.55

def mat(name, col, rough=0.9, tex=None, glass=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']
    if glass:
        b.inputs['Base Color'].default_value = (0.75,0.8,0.85,1)
        b.inputs['Roughness'].default_value = 0.05; b.inputs['Metallic'].default_value = 0.0
        b.inputs['Alpha'].default_value = 1.0
        return m
    b.inputs['Roughness'].default_value = rough
    if tex:
        t = n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = tex; t.inputs['Detail'].default_value = 14
        r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position = 0.35; r.color_ramp.elements[1].position = 0.65
        r.color_ramp.elements[0].color = (col[0]*0.55,col[1]*0.55,col[2]*0.55,1); r.color_ramp.elements[1].color = (*col,1)
        l.new(t.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color'])
        bu = n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value = 0.6
        l.new(t.outputs['Fac'], bu.inputs['Height']); l.new(bu.outputs['Normal'], b.inputs['Normal'])
    else:
        b.inputs['Base Color'].default_value = (*col,1)
    return m
concrete = mat('c',(0.62,0.62,0.6),0.95,tex=60)
dark = mat('d',(0.03,0.03,0.03),0.5)
glass = mat('g',(0.4,0.45,0.5),glass=True)
def box(x0,x1,y0,y1,z0,z1,m):
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.location = ((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); o.scale = ((x1-x0)/2,(y1-y0)/2,(z1-z0)/2)
    o.data.materials.append(m); return o
# x width, y depth (camera looks +y), z up
D = 0.0
box(-14,14,0,12,-0.15,0,concrete)                        # ground slab
# podium / base
box(-9,9,0,6,0,3.2,concrete)
box(-14,-9,0,3,0,2.0,concrete); box(9,14,0,3,0,2.0,concrete)
# stairs left
for i in range(7): box(-14.5+i*0.0,-9.2,-i*0.0+0,3,i*0.0,0.01,concrete)
for i in range(7): box(-14.5,-12.8+i*0.5,-0.9,0.2,i*0.28,(i+1)*0.28,concrete)
# main two storeys
for lvl,z0 in enumerate((3.2,7.4)):
    box(-9,9,0,6,z0+3.7,z0+4.2,concrete)                   # slab
    # side solid wings
    box(-9,-5.2,0.2,5.8,z0,z0+3.7,concrete); box(5.2,9,0.2,5.8,z0,z0+3.7,concrete)
    # glazing core
    box(-5.2,5.2,1.0,1.15,z0,z0+3.7,glass)
    for k in range(-5,6): box(k-0.07,k+0.07,0.6,1.3,z0,z0+3.7,dark)
    box(-5.2,5.2,0.6,1.3,z0+1.9,z0+2.0,dark)
# big fins
for x in (-9.3,-4.3,-0.6,0.6,4.3,9.3): pass
box(-9.6,-9.0,-0.6,6,3.2,13.2,dark)
box(9.0,9.6,-0.6,6,3.2,13.2,dark)
box(-6.0,-5.4,-1.2,6,3.2,14.2,concrete); box(5.4,6.0,-1.2,6,3.2,14.2,concrete)
# projecting centre frame
box(-3.2,3.2,-1.4,-0.2,7.0,7.5,concrete); box(-3.2,-2.6,-1.4,-0.2,7.0,11.8,concrete)
box(2.6,3.2,-1.4,-0.2,7.0,11.8,concrete); box(-3.2,3.2,-1.4,-0.2,11.4,11.9,concrete)
# roof parapet blocks
box(-9,-5.2,0.2,5.8,11.6,12.6,concrete); box(5.2,9,0.2,5.8,11.6,12.6,concrete)
# retaining walls front
box(-5.8,5.0,-2.2,-0.2,0,3.6,concrete); box(6.4,13.8,-1.5,-0.2,0,2.4,concrete)
# trees (bare, thin branches)
import bmesh
from mathutils import Vector, Matrix
def tree(x,h):
    bm=bmesh.new()
    def br(p,d,L,t,dep):
        if dep==0: return
        d=Vector(d).normalized(); q=p+d*L
        m=Matrix.Translation((p+q)/2)@Vector((0,0,1)).rotation_difference(d).to_matrix().to_4x4()
        bmesh.ops.create_cone(bm,cap_ends=False,segments=4,radius1=t,radius2=t*0.62,depth=L,matrix=m)
        for _ in range(3 if dep>2 else 2):
            nd=Vector((d.x+random.uniform(-1.1,1.1),random.uniform(-.2,.2),d.z*0.55+random.uniform(0.0,.6))).normalized()
            br(q,nd,L*0.8,t*0.6,dep-1)
    br(Vector((x,-3.0,0)),(random.uniform(-.1,.1),0,1),h*0.38,0.13,8)
    me=bpy.data.meshes.new('t'); bm.to_mesh(me); o=bpy.data.objects.new('t',me); o.data.materials.append(dark)
    bpy.context.collection.objects.link(o)
tree(-16.5,9); tree(16.5,9.5); tree(-19.5,7); tree(19.5,7.5)
# sun
bpy.ops.object.light_add(type='SUN'); s=bpy.context.object
s.rotation_euler=(math.radians(52),math.radians(0),math.radians(-55)); s.data.energy=5.5; s.data.angle=math.radians(1.2)
# camera ortho
bpy.ops.object.camera_add(location=(0,-60,6.6),rotation=(math.radians(90),0,0)); c=bpy.context.object
c.data.type='ORTHO'; c.data.ortho_scale=45; sc.camera=c
bpy.ops.render.render(write_still=True)
