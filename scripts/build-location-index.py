"""Build a local Qatar location search index from licensed OSM data (requires osmium).
Usage: python scripts/build-location-index.py INPUT.osm.pbf data/geocoding/qatar-places.json.gz
Normal app startup does not need Python, a network geocoder, or an API key.
"""
import osmium,json,gzip,sys,hashlib
from pathlib import Path
from datetime import datetime,timezone
SOURCE='https://download.openstreetmap.fr/extracts/asia/qatar.osm.pbf'
class Places(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.rows=[];self.keys=set()
 def add(self,kind,id,t,lon,lat):
  if not(50<=lon<=52.5 and 24<=lat<=27):return
  if t.get('access') in {'private','no'} or t.get('military') or t.get('construction'):return
  names=list(dict.fromkeys(filter(None,[t.get('name:en'),t.get('name'),t.get('name:ar'),t.get('official_name'),t.get('alt_name'),t.get('short_name')])) )
  street=t.get('addr:street') or t.get('addr:place');house=t.get('addr:housenumber');city=t.get('addr:city');district=t.get('addr:suburb') or t.get('addr:district')
  address=', '.join(dict.fromkeys(filter(None,[('Building '+house) if house else None,street,district,city,t.get('addr:postcode')])))
  if not names and not(house and street):return
  category=next((t.get(k) for k in ['place','aeroway','railway','amenity','shop','tourism','leisure','office','highway','building'] if t.get(k)),None)
  if not category and not address:return
  if category in {'yes','residential','apartments'} and not address and not(t.get('shop') or t.get('amenity')):return
  name=names[0] if names else address
  # Street segments repeat OSM names; retain distinct local portions, not every way.
  cell=0.01 if t.get('highway') else .0005
  key=(name.casefold(),str(category),round(lon/cell),round(lat/cell))
  if key in self.keys:return
  self.keys.add(key)
  priority=100 if t.get('place') in {'city','town','suburb','neighbourhood'} else 80 if t.get('aeroway') in {'aerodrome','terminal'} else 70 if t.get('shop')=='mall' else 55 if t.get('amenity') in {'university','hospital','school'} or t.get('tourism') else 35 if t.get('railway') else 10 if t.get('highway') else 25
  self.rows.append({'id':f'osm-{kind}-{id}','name':name,'aliases':' '.join(names[1:]),'category':str(category or 'address').replace('_',' '),'address':address or 'Qatar','latitude':round(lat,7),'longitude':round(lon,7),'priority':priority,'source':'OpenStreetMap','is_demo':False})
 def node(self,n):
  if n.location.valid():self.add('node',n.id,n.tags,n.lon,n.lat)
 def way(self,w):
  if not(w.tags.get('name') or w.tags.get('name:en') or w.tags.get('addr:street')):return
  coords=[(n.lon,n.lat) for n in w.nodes if n.location.valid()]
  if not coords:return
  # Search anchor only; never treated as a surveyed building entrance or route.
  lon=sum(p[0] for p in coords)/len(coords);lat=sum(p[1] for p in coords)/len(coords)
  self.add('way',w.id,w.tags,lon,lat)
p=Path(sys.argv[1]);out=Path(sys.argv[2]);handler=Places();handler.apply_file(str(p),locations=True)
with osmium.io.Reader(str(p)) as reader:timestamp=reader.header().get('osmosis_replication_timestamp')
result={'source':SOURCE,'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'osm_timestamp':timestamp,'license':'ODbL-1.0','built_at':datetime.now(timezone.utc).isoformat(),'places':handler.rows}
out.parent.mkdir(parents=True,exist_ok=True)
with gzip.open(out,'wt',encoding='utf8',compresslevel=9) as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
print(json.dumps({'places':len(handler.rows),'gzip_bytes':out.stat().st_size,'timestamp':timestamp}))
