# Qatar location search index

`qatar-places.json.gz` is a bundled OpenStreetMap search snapshot. It allows English/Arabic names, aliases, streets and mapped addresses to be searched without a geocoder account. Supabase search choices remain included; this index expands location selection, not transit or pedestrian routing coverage.

Source: https://download.openstreetmap.fr/extracts/asia/qatar.osm.pbf
License: Open Database License 1.0, https://opendatacommons.org/licenses/odbl/1-0/
Attribution: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
Snapshot timestamp and source SHA-256 are embedded in the compressed file. Ways use a representative geometry centre, not a verified entrance. Search results are map locations; pedestrian routing must still find a usable network connection. Coverage and freshness depend on OSM contributions.

Rebuild with Python and osmium installed:

```sh
python scripts/build-location-index.py qatar.osm.pbf data/geocoding/qatar-places.json.gz
```

The running app needs no Python. An explicitly configured `PHOTON_URL` switches the server geocoder to that provider. Public community autocomplete services are not used automatically.
