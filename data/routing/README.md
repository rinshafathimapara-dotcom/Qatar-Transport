# Bundled walking and rail data

© OpenStreetMap contributors. The bundled databases and OSM-derived mall outline are made available under the **Open Database License 1.0 (ODbL)**: https://opendatacommons.org/licenses/odbl/1-0/ . Attribution: https://www.openstreetmap.org/copyright . Report map errors: https://www.openstreetmap.org/fixthemap . This data is separate from the application's source-code licences.

Source extract: https://download.openstreetmap.fr/extracts/asia/qatar.osm.pbf (OSM France). Data timestamp: **2026-11-07T00:10:20Z**. The compressed walking database embeds the extract SHA-256, timestamp, source URL, build timestamp and licence, plus original OSM node/way IDs.

- `doha-walking.json.gz`: derived outdoor pedestrian graph, **307,839 nodes / 338,471 segments**, about 5.8 MB compressed. Pilot bounds: **51.40–51.60° E, 25.22–25.43° N**. No whole-country walking coverage is claimed.
- `qatar-rail.json.gz`: member-way geometry from **17 OSM subway/tram/light-rail route relations**. This describes mapped tracks, not service availability, operating timetables, tickets or live trains.

## Walking profile

Connectivity comes only from shared OSM node IDs; intersecting lines are never joined by visual proximity. The builder excludes private/no-access ways, restricted gates, motorways/trunks, known indoor or level-tagged ways and construction. Major roads/cycleways require affirmative pedestrian/sidewalk tagging. Other selected street/path classes use mapped foot access; sidewalk quality, crossings, accessibility and legal/public access can still be incomplete or outdated. This is a conservative pilot profile, not a safety-certified pedestrian engine.

A* searches the supplied graph. Start/end points snap to an existing segment within 150 m; snap distances are returned to the UI. No straight connector is invented between disconnected components or across water. The resulting route follows mapped ways, which may represent a road centreline rather than a surveyed sidewalk. Walking time assumes 75 m/min; heat, closures, signals and live conditions are not measured. The GPS dot is never forcibly snapped to the graph.

Building exclusions remove network edges that cross supplied reviewed footprints. Indoor passages are excluded from automatic general routing and must use separately reviewed access data. Hypothetical demonstration doors cannot enter live navigation.

## Rebuild (optional developer task)

Normal app users do not need Python or a download: the graph files are included in Git and read only by the Node server.

```sh
python -m venv work/osm-tools
work/osm-tools/bin/pip install osmium
curl -fL https://download.openstreetmap.fr/extracts/asia/qatar.osm.pbf -o work/qatar.osm.pbf
work/osm-tools/bin/python scripts/build-walking-network.py work/qatar.osm.pbf data/routing/doha-walking.json.gz
work/osm-tools/bin/python scripts/build-transit-geometries.py work/qatar.osm.pbf data/routing/qatar-rail.json.gz
```

On Windows use the venv's `Scripts` directory. Rebuilding changes the data snapshot; rerun routing tests, review the profile, update this date, and check data licence requirements before distributing a new graph. Do not use restricted team census data to generate these files.

The mall concept uses the actual OSM outline of **City Center, way 1386125539**. Its illustrative doors/interior/perimeter paths are explicitly hypothetical, separately labelled and never offered as live directions. Their coordinates do not establish actual entry rights, doors, indoor circulation or air conditioning.
