# Iso massing plate (Cycles CPU). Run: blender -b -P plate.py -- out.png W H samples kind
import bpy, sys, math, random
from mathutils import Vector
a = sys.argv[sys.argv.index('--')+1:]
out, W, H, S, kind = a[0], int(a[1]), int(a[2]), int(a[3]), a[4]
random.seed(abs(hash(kind)) % 1000 if False else sum(map(ord, kind)))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=S; sc.cycles.use_denoising=True
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.film_transparent=True
sc.render.image_settings.color_mode='RGBA'; sc.render.filepath=out; sc.view_settings.view_transform='Standard'
wd=bpy.data.worlds.new('w'); sc.world=wd; wd.use_nodes=True
b=wd.node_tree.nodes['Background']; b.inputs[0].default_value=(0.92,0.92,0.9,1); b.inputs[1].default_value=0.6
def mat(col, tex=50):
    m=bpy.data.materials.new('m'); m.use_nodes=True; n=m.node_tree.nodes; l=m.node_tree.links; bs=n['Principled BSDF']; bs.inputs['Roughness'].default_value=0.95
    t=n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value=tex; t.inputs['Detail'].default_value=14
    r=n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position=.35; r.color_ramp.elements[1].position=.65
    r.color_ramp.elements[0].color=(col*.55,col*.55,col*.55,1); r.color_ramp.elements[1].color=(col,col,col,1)
    l.new(t.outputs['Fac'],r.inputs['Fac']); l.new(r.outputs['Color'],bs.inputs['Base Color'])
    bu=n.new('ShaderNodeBump'); bu.inputs['Strength'].default_value=.5; l.new(t.outputs['Fac'],bu.inputs['Height']); l.new(bu.outputs['Normal'],bs.inputs['Normal']); return m
conc=mat(.64); dk=mat(.2,30)
def box(x0,x1,y0,y1,z0,z1,m=conc):
    bpy.ops.mesh.primitive_cube_add(); o=bpy.context.object
    o.location=((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); o.scale=((x1-x0)/2,(y1-y0)/2,(z1-z0)/2); o.data.materials.append(m)
def room(x,y,w,d,h,t=.25,door=True):  # walled room without roof (cut-away plan)
    box(x,x+w,y,y+t,0,h); box(x,x+w,y+d-t,y+d,0,h); box(x,x+t,y,y+d,0,h); box(x+w-t,x+w,y,y+d,0,h)
    box(x+t,x+w-t,y+t,y+d-t,0,.1,dk)
def seats(x,y,rows,cols,dx=1.1,dy=1.0):
    for i in range(rows):
        for j in range(cols): box(x+j*dx,x+j*dx+.7,y+i*dy,y+i*dy+.4,0,.45,dk)
box(-21,21,-15,15,-.3,0)
if kind=='lecture':
    room(-14,-9,28,18,2.4); seats(-10,-6,7,17); box(-9,9,6,7,0,.5,dk); room(-14,10,10,6,2.4)
elif kind=='library':
    room(-15,-10,30,20,2.6)
    for i in range(6): box(-12,12,-7+i*2.6,-6.6+i*2.6,0,1.9,dk)
    room(-20,-4,5,8,2.6); room(15,-4,5,8,2.6)
elif kind=='exam':
    room(-13,-9,26,18,2.2)
    for i in range(6):
        for j in range(12): box(-10.5+j*1.9,-9.7+j*1.9,-6.5+i*2.2,-5.8+i*2.2,0,.8,dk)
    room(-19,-2,5,6,2.2)
elif kind=='campus':
    for (x,y,w,d,h) in [(-18,-12,12,8,3.2),(-2,-12,8,12,4.6),(10,-12,10,8,2.8),(-18,2,9,10,2.4),(-6,6,14,8,3.6),(12,2,8,12,5.4)]:
        box(x,x+w,y,y+d,0,h); box(x+1,x+w-1,y+1,y+d-1,h,h+.15,dk)
    for i in range(10): box(-20+i*4,-19.6+i*4,-14,-13.6,0,3.0,dk)
elif kind=='admin':
    room(-16,-8,16,16,2.8); room(1,-8,15,7,2.8); room(1,1,15,7,2.8)
    for i in range(5): box(-14,-3,-5+i*2.2,-4.5+i*2.2,0,.9,dk)
elif kind=='lab':
    room(-14,-9,28,18,2.6)
    for i in range(3):
        box(-11+i*8.5,-5+i*8.5,-4,2,0,1.0,dk); box(-10.5+i*8.5,-5.5+i*8.5,-3.5,1.5,1.0,1.1,conc)
    box(-12,12,5,5.6,0,1.1,dk); room(-20,-3,6,6,2.6)
bpy.ops.object.light_add(type='SUN'); s=bpy.context.object; s.rotation_euler=(math.radians(50),0,math.radians(-50)); s.data.energy=5; s.data.angle=math.radians(1.2)
bpy.ops.object.camera_add(); c=bpy.context.object
d=Vector((1,-1,.85)).normalized()*60; c.location=d; c.rotation_euler=(-d).to_track_quat('-Z','Y').to_euler()
c.data.type='ORTHO'; c.data.ortho_scale=(58 if kind=='campus' else 44); sc.camera=c
bpy.ops.render.render(write_still=True)
