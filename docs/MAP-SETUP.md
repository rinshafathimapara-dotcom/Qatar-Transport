# Street-map background — no signup required

## Default: OpenFreeMap

The app now uses https://openfreemap.org/ by default. Its official public service explicitly allows website/app usage without signup, API keys or registration. The map data is from OpenStreetMap; it is served by independent OpenFreeMap infrastructure, not the blocked OpenStreetMap community raster server.

1. In Codespaces, stop the running app using Ctrl+C.
2. Run `git pull origin main`.
3. Run `npm install` to add the vector renderer and official Leaflet adapter.
4. If you previously set any map-provider overrides in `.env.local`, remove or blank only these lines: `NEXT_PUBLIC_CARTO_MAPS_KEY`, `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`. Keep the Supabase variables.
5. Run `npm run dev` and open port 3000 using **Ports → Open in Browser**.

No new environment variables, account, card or key are required. OpenFreeMap needs an Internet connection and the vector renderer needs WebGL. Leaflet retains the app's marker selection, stops, shade layers and route polylines. The required OpenFreeMap/OpenMapTiles/OpenStreetMap credit is shown in Leaflet's attribution control.

Official references checked on 7 November 2026:
- https://openfreemap.org/ — service, commercial usage and attribution details.
- https://openfreemap.org/quick_start/ — explicitly documents the Leaflet integration used here.
- https://openfreemap.org/tos/ — current terms; the app does not prefetch areas or perform offline bulk downloads.
- https://github.com/maplibre/maplibre-gl-leaflet — official adapter.

OpenFreeMap does not offer an SLA. A future production operator can choose self-hosting or another licensed provider if service guarantees are needed. No proxy, forged header or alternative OSM tile-server hostname is used to evade the previous block.

## Optional provider overrides

These are optional and take precedence over OpenFreeMap:

- An authorized custom raster URL with `{z}`, `{x}` and `{y}` via `NEXT_PUBLIC_MAP_TILE_URL`, plus required `NEXT_PUBLIC_MAP_ATTRIBUTION` text. Verify custom credits meet provider terms.
- A CARTO browser key via `NEXT_PUBLIC_CARTO_MAPS_KEY`. Its current service requires a key, including on free tiers; https://carto.com/basemaps/apikey/ and https://carto.com/legal/basemap-terms/.

Do not reuse your Supabase key for maps. `.env.local` remains ignored by Git. The blocked OSM raster host and its subdomains remain rejected as explicit custom configuration.

## Failure handling

Failed providers stop rendering and offer manual **Retry map**. Dataset markers and schematic journey lines remain visible on a clearly labelled neutral background. A basemap failure does not change Supabase data or convert demo routes into verified routes.
