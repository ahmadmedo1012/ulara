# Iso massing plate (Cycles CPU). Run: blender -b -P plate.py -- out.png W H samples kind
import bpy, sys, math, random
from mathutils import Vector
a = sys.argv[sys.argv.index('--')+1:]
out, W, H, S, kind = a[0], int(a[1]), int(a[2]), int(a[3]), a[4]
FLAT = len(a) > 5 and a[5] == 'flat'   # top-down plan view instead of iso
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
def emis(v):
    m=bpy.data.materials.new('e'); m.use_nodes=True; n=m.node_tree.nodes; l=m.node_tree.links
    for x in list(n): n.remove(x)
    e=n.new('ShaderNodeEmission'); e.inputs['Color'].default_value=(v,v,v,1); o=n.new('ShaderNodeOutputMaterial'); l.new(e.outputs[0],o.inputs[0]); return m
paper=emis(1.0); fl=dk
if FLAT: conc=emis(.06); dk=emis(.4); fl=emis(.9); paper=emis(1.0)
def box(x0,x1,y0,y1,z0,z1,m=conc):
    bpy.ops.mesh.primitive_cube_add(); o=bpy.context.object
    o.location=((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); o.scale=((x1-x0)/2,(y1-y0)/2,(z1-z0)/2); o.data.materials.append(m)
def room(x,y,w,d,h,t=.25,door=True):  # walled room without roof (cut-away plan); front wall has a door gap
    g=2.2
    mx=x+w*0.38
    box(x,mx,y,y+t,0,h); box(mx+g,x+w,y,y+t,0,h)
    box(x,x+w,y+d-t,y+d,0,h); box(x,x+t,y,y+d,0,h); box(x+w-t,x+w,y,y+d,0,h)
    box(x+t,x+w-t,y+t,y+d-t,0,.1,fl)
    if FLAT: box(mx,mx+0.12,y,y+g*0.95,0,.2,dk)   # door leaf (swing line stand-in)
def part(x0,y0,x1,y1,h=2.4,gap=None):  # interior partition with an optional door gap
    if x0==x1:
        if gap: box(x0-.12,x0+.12,y0,gap[0],0,h); box(x0-.12,x0+.12,gap[1],y1,0,h)
        else: box(x0-.12,x0+.12,y0,y1,0,h)
    else:
        if gap: box(x0,gap[0],y0-.12,y0+.12,0,h); box(gap[1],x1,y0-.12,y0+.12,0,h)
        else: box(x0,x1,y0-.12,y0+.12,0,h)
def seats(x,y,rows,cols,dx=1.1,dy=1.0):
    for i in range(rows):
        for j in range(cols): box(x+j*dx,x+j*dx+.7,y+i*dy,y+i*dy+.4,0,.45,dk)
box(-21,21,-15,15,-.3,0,paper if FLAT else conc)
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
        for j in range(4): box(-10.6+i*8.5+j*1.2,-10.1+i*8.5+j*1.2,-5.6,-5.1,0,.5,dk)
        box(-10+i*8.5,-8.5+i*8.5,-1,0.3,1.1,1.4,dk)
    box(-12,12,5,5.6,0,1.1,dk); box(-12,12,6.4,7,0,1.1,dk); box(-8,-7.7,-8.8,9,0,2.6,conc); box(4,4.3,-8.8,9,0,2.6,conc)
    room(-20,-3,6,6,2.6); box(10,13,-8,-5,0,2.2,dk)
if kind=='lecture': part(-4,-9,-4,-5,gap=None); part(4,-9,4,-5)
if kind=='library': part(-15,0,-8,0,gap=(-12,-10)); part(8,0,15,0,gap=(11,13))
if kind=='exam': part(-13,-3,-9,-3,gap=(-12,-10)); part(9,-3,13,-3)
if kind=='admin': part(-8,-8,-8,-3,gap=None); part(-16,0,-8,0,gap=(-13,-11)); part(8,-8,8,-1)
if kind=='lab': part(-14,-1,-6,-1,gap=(-11,-9)); part(6,-1,14,-1,gap=(9,11)); part(0,-9,0,-4)
def dim(x0,y0,x1,y1):  # dimension string with end ticks
    box(min(x0,x1),max(x0,x1)+.08,min(y0,y1),max(y0,y1)+.08,0,.03,dk)
    for (x,y) in ((x0,y0),(x1,y1)): box(x-.5 if y0==y1 else x-.04,x+.5 if y0==y1 else x+.04,y-.04 if y0==y1 else y-.5,y+.04 if y0==y1 else y+.5,0,.03,dk)
def grid(x0,x1,y0,y1,st=3):
    for gx in range(int(x0),int(x1)+1,st):
        for gy in range(int(y0),int(y1)+1,st): box(gx-.08,gx+.08,gy-.08,gy+.08,0,.03,dk)

def rbox(cx,cy,ln,ang,th=.07,m=None):  # thin rotated bar (hatching, door swing), sits above the floor slab
    bpy.ops.mesh.primitive_cube_add(); o=bpy.context.object
    o.location=(cx,cy,.16); o.scale=(ln/2,th/2,.03); o.rotation_euler=(0,0,math.radians(ang)); o.data.materials.append(m or dk)
def hatch(x0,y0,x1,y1,st=.8,ang=45):  # 45-degree hatching, each line clipped to the rectangle
    c=(x0-y1); 
    while c<=x1-y0:
        pts=[]
        for (x,y) in ((c+y0,y0),(c+y1,y1),(x0,x0-c),(x1,x1-c)):
            if x0-1e-6<=x<=x1+1e-6 and y0-1e-6<=y<=y1+1e-6: pts.append((x,y))
        if len(pts)>=2:
            (ax,ay),(bx,by)=pts[0],pts[-1]; ln=math.hypot(bx-ax,by-ay)
            if ln>.2: rbox((ax+bx)/2,(ay+by)/2,ln,45,.05)
        c+=st
def swing(x,y,ln=2.1,ang=40):
    rbox(x+ln*.5*math.cos(math.radians(ang)),y+ln*.5*math.sin(math.radians(ang)),ln,ang,.06)
def chairs(x0,x1,y,n):  # small chairs either side of a table run
    st=(x1-x0)/n
    for i in range(n): box(x0+i*st+.3,x0+i*st+.8,y-.7,y-.25,0,.15,dk); box(x0+i*st+.3,x0+i*st+.8,y+.25,y+.7,0,.15,dk)
if FLAT:
    if kind=='lecture': hatch(-13.6,10.4,-4.4,15.6); swing(-9,9.9); box(-3,3,-8.5,-7.5,0,.15,dk); hatch(-13.6,-8.7,-4.4,-6.2,.6)
    if kind=='library':
        for i in range(6): chairs(-12,12,-6.8+i*2.6,12)
        hatch(-19.7,-3.6,-15.3,3.6); hatch(15.3,-3.6,19.7,3.6); swing(-12,0)
    if kind=='exam':
        for i in range(6):
            for j in range(12): box(-10.4+j*1.9,-9.8+j*1.9,-7.6+i*2.2,-7.2+i*2.2,0,.15,dk)
        hatch(-18.7,-1.7,-14.3,3.7); swing(-12,-3)
    if kind=='admin':
        for i in range(5): box(-13.2,-12.6,-5.6+i*2.2,-5.0+i*2.2,0,.15,dk); box(-4.6,-4.0,-5.6+i*2.2,-5.0+i*2.2,0,.15,dk)
        hatch(1.4,-7.6,15.6,-1.4); hatch(1.4,1.4,15.6,7.6); swing(-13,0)
    if kind=='lab':
        hatch(-19.7,-2.7,-14.3,2.7); swing(-11,-1); swing(11,-1,ang=140)
    if kind=='campus':
        for (x,y,w,d,h) in [(-18,-12,12,8,3.2),(-2,-12,8,12,4.6),(10,-12,10,8,2.8)]: hatch(x+.5,y+.5,x+w-.5,y+d-.5,1.2)
if kind=='lecture': dim(-14,-12,14,-12); dim(-17,-9,-17,9); grid(-18,18,-13,13)
if kind=='library': dim(-15,-13,15,-13); dim(-23,-10,-23,10); grid(-18,18,-13,13)
if kind=='exam': dim(-13,-12,13,-12); dim(-17,-9,-17,9); grid(-18,18,-13,13)
if kind=='admin': dim(-16,-11,16,-11); dim(-19,-8,-19,8); grid(-18,18,-13,13)
if kind=='lab': dim(-14,-12,14,-12); dim(-17,-9,-17,9); grid(-18,18,-13,13)
if kind=='campus': dim(-18,-15,20,-15); grid(-20,20,-14,14,4)
sc.render.use_freestyle=True; sc.render.line_thickness_mode='ABSOLUTE'; sc.render.line_thickness=1.1
vl=bpy.context.view_layer; vl.use_freestyle=True
ls=vl.freestyle_settings.linesets.new('ink') if not vl.freestyle_settings.linesets else vl.freestyle_settings.linesets[0]
ls.linestyle=bpy.data.linestyles.new('ls'); ls.select_silhouette=True; ls.select_border=True; ls.select_crease=True
ls.linestyle.color=(0.02,0.02,0.02); ls.linestyle.thickness=1.3
bpy.ops.object.light_add(type='SUN'); s=bpy.context.object; s.rotation_euler=(math.radians(50),0,math.radians(-50)); s.data.energy=0.3 if FLAT else 5; s.data.angle=math.radians(1.2)
bpy.ops.object.camera_add(); c=bpy.context.object
d=(Vector((0.0001,-0.0001,1)).normalized() if FLAT else Vector((1,-1,.85)).normalized())*60; c.location=d+(Vector((0,1.5,0)) if FLAT else Vector((0,0,0))); c.rotation_euler=(-d).to_track_quat('-Z','Y').to_euler()
c.data.type='ORTHO'; c.data.ortho_scale=((62 if kind=='campus' else 52) if FLAT else (58 if kind=='campus' else 44)); sc.camera=c
bpy.ops.render.render(write_still=True)
