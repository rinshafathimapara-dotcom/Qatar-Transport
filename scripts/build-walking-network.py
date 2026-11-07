"""Build the bundled ODbL pedestrian graph from a Qatar OSM PBF. Requires osmium.
Usage: python scripts/build-walking-network.py INPUT.osm.pbf data/routing/doha-walking.json.gz
No synthetic edges or intersections are generated. Shared OSM node IDs define connectivity.
"""
import osmium, sys, json, gzip, math, hashlib
from pathlib import Path
from datetime import datetime, timezone
SOURCE='https://download.openstreetmap.fr/extracts/asia/qatar.osm.pbf'
BBOX=[51.40,25.22,51.60,25.43]
ALLOWED={'residential','living_street','pedestrian','footway','path','steps','service','unclassified','tertiary','tertiary_link','track','road'}
DENIED={'no','private','military','customers','delivery','permit'}
def meters(a,b):
 r=math.pi/180;lat1=a[1]*r;lat2=b[1]*r;dlat=lat2-lat1;dlon=(b[0]-a[0])*r
 h=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
 return 6371000*2*math.atan2(math.sqrt(h),math.sqrt(max(0,1-h)))
class Walk(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.nodes={};self.edges=[];self.names=['Mapped pedestrian way'];self.name_ids={self.names[0]:0};self.blocked=set();self.malls=[]
 def node(self,n):
  t=n.tags
  if t.get('barrier') in {'wall','fence','gate','lift_gate','turnstile'} and (t.get('locked')=='yes' or t.get('access') in DENIED or t.get('foot') in DENIED):self.blocked.add(n.id)
 def way(self,w):
  t=w.tags;kind=t.get('highway');name=t.get('name:en') or t.get('name') or ('Steps' if kind=='steps' else 'Mapped pedestrian way')
  if w.is_closed() and ('city center' in name.lower() or 'city centre' in name.lower()):
   coords=[[round(n.lon,7),round(n.lat,7)] for n in w.nodes if n.location.valid()]
   if len(coords)>3:self.malls.append({'name':name,'osm_way_id':w.id,'coordinates':coords})
  if kind not in ALLOWED and not(kind in {'primary','secondary','primary_link','secondary_link','cycleway'} and (t.get('foot') in {'yes','designated','permissive'} or t.get('sidewalk') in {'yes','both','left','right'})):return
  if t.get('foot') in DENIED or (t.get('access') in DENIED and t.get('foot') not in {'yes','designated','permissive'}):return
  if t.get('indoor')=='yes' or t.get('level') is not None or t.get('construction') is not None:return
  if name not in self.name_ids:self.name_ids[name]=len(self.names);self.names.append(name)
  ns=[(n.ref,[round(n.lon,7),round(n.lat,7)]) for n in w.nodes if n.location.valid()]
  # Never bridge across a missing node in an incomplete source way.
  if len(ns)!=len(w.nodes):return
  direction=t.get('oneway:foot','no');flags=(0 if direction in {'yes','1','-1'} else 1)|(2 if kind=='steps' else 0)
  for (a,p),(b,q) in zip(ns,ns[1:]):
   if a in self.blocked or b in self.blocked or a==b:continue
   if not all(BBOX[0]<=v[0]<=BBOX[2] and BBOX[1]<=v[1]<=BBOX[3] for v in [p,q]):continue
   d=round(meters(p,q),2)
   if d<=0:continue
   self.nodes[a]=p;self.nodes[b]=q
   if direction=='-1':a,b=b,a
   self.edges.append((a,b,d,self.name_ids[name],flags,w.id))
source=Path(sys.argv[1]);out=Path(sys.argv[2]);h=Walk();h.apply_file(str(source),locations=True)
ids=sorted(h.nodes);index={v:i for i,v in enumerate(ids)}
with osmium.io.Reader(str(source)) as reader:timestamp=reader.header().get('osmosis_replication_timestamp')
graph={'version':1,'coverage':BBOX,'source':SOURCE,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'osm_timestamp':timestamp,'built_at':datetime.now(timezone.utc).isoformat(),'license':'ODbL-1.0','nodes':[h.nodes[i] for i in ids],'osm_node_ids':ids,'names':h.names,'edges':[[index[a],index[b],d,n,f,w] for a,b,d,n,f,w in h.edges]}
out.parent.mkdir(parents=True,exist_ok=True)
with gzip.open(out,'wt',encoding='utf-8',compresslevel=9) as f:json.dump(graph,f,ensure_ascii=False,separators=(',',':'))
if len(sys.argv)>3:Path(sys.argv[3]).write_text(json.dumps(h.malls,ensure_ascii=False,indent=2))
print(json.dumps({'nodes':len(ids),'edges':len(h.edges),'gzip_bytes':out.stat().st_size,'osm_timestamp':timestamp,'malls':len(h.malls)}))
