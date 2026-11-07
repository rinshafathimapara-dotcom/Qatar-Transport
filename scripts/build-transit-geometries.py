"""Extract actual OSM Metro/tram relation geometry; does not create routes or schedules."""
import osmium,json,gzip,sys
from pathlib import Path
from math import radians,sin,cos,atan2,sqrt
class Relations(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.lines=[]
 def relation(self,r):
  if r.tags.get('route') in {'subway','light_rail','tram'}:
   self.lines.append({'relationId':r.id,'name':r.tags.get('name:en') or r.tags.get('name'),'ref':r.tags.get('ref',''),'mode':'metro' if r.tags.get('route')=='subway' else 'tram','ways':[m.ref for m in r.members if m.type=='w' and m.role not in {'platform','stop'}]})
class Ways(osmium.SimpleHandler):
 def __init__(self,needed):super().__init__();self.needed=needed;self.ways={}
 def way(self,w):
  if w.id in self.needed and w.tags.get('railway') in {'subway','light_rail','tram','rail'}:
   if all(n.location.valid() for n in w.nodes):self.ways[w.id]=[(n.ref,[round(n.lon,7),round(n.lat,7)]) for n in w.nodes]
def dist(a,b):
 r=6371000;la,lb=map(radians,[a[1],b[1]]);dlat=lb-la;dlon=radians(b[0]-a[0]);h=sin(dlat/2)**2+cos(la)*cos(lb)*sin(dlon/2)**2;return round(2*r*atan2(sqrt(h),sqrt(max(0,1-h))),2)
pbf=sys.argv[1];relations=Relations();relations.apply_file(pbf);ways=Ways({w for l in relations.lines for w in l['ways']});ways.apply_file(pbf,locations=True);result=[]
for line in relations.lines:
 coords={n:p for w in line['ways'] for n,p in ways.ways.get(w,[])};ids=sorted(coords);index={n:i for i,n in enumerate(ids)}
 edges=[[index[a],index[b],dist(p,q),0,1,w] for w in line['ways'] for (a,p),(b,q) in zip(ways.ways.get(w,[]),ways.ways.get(w,[])[1:]) if a!=b]
 if edges:result.append({**{k:v for k,v in line.items() if k!='ways'},'graph':{'version':1,'source':f"https://www.openstreetmap.org/relation/{line['relationId']}",'osm_timestamp':'Source extract timestamp in doha-walking.json.gz','nodes':[coords[n] for n in ids],'names':[line['name']],'edges':edges}})
with gzip.open(sys.argv[2],'wt',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
print('Rail relation graphs:',len(result),'bytes:',Path(sys.argv[2]).stat().st_size)
