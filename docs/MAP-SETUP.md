# Restore the street-map background

The supplied screenshot shows access-blocked tiles from OpenStreetMap's public tile service. That basemap service is separate from Supabase records. Do not work around its block with alternate subdomains, a proxy or spoofed request headers.

## CARTO setup for this student prototype

1. Open https://carto.com/basemaps/apikey/.
2. Click **Request a key** and complete the email form. The current page says no full account is required and the key is delivered by email. If the embedded form fails, use its **open the form on its own page** link.
3. Review the current [basemap terms](https://carto.com/legal/basemap-terms/). They currently include a free non-commercial tier; use a plan appropriate to the actual project. A person must request and accept the key.
4. Pull the latest repository code. In Codespaces, stop the dev server with Ctrl+C and run `git pull origin main`.
5. In the existing `.env.local` next to `package.json`, keep both Supabase lines and add:

```env
NEXT_PUBLIC_CARTO_MAPS_KEY=YOUR_CARTO_BASEMAP_KEY
```

6. Leave `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` blank unless intentionally using another authorized provider. An old custom URL takes precedence and will prevent CARTO from being selected.
7. Restart with `npm run dev` and open port 3000 from Codespaces **Ports → Open in Browser**. In a Windows PowerShell terminal use `npm.cmd run dev`.
8. If adding website restrictions in CARTO's emailed dashboard, use the actual preview website origin, such as `https://YOUR-CODESPACE-3000.app.github.dev`, not the GitHub repository URL. Keep the Codespaces preview private; domain restrictions alone do not change its audience.

The application supplies the required OpenStreetMap and CARTO attribution. The map key is a browser key and will be visible in tile requests. `.env.local` stays out of GitHub; configure provider restrictions and usage limits as appropriate. This is not your Supabase key and does not change database access.

## Custom provider

Use an authorized HTTPS raster URL with `{z}`, `{x}` and `{y}`, and specify the provider credit using `NEXT_PUBLIC_MAP_ATTRIBUTION`. Custom credit is rendered as plain text beside the OSM credit; verify it meets your provider's requirements. The blocked OSM tile host and its subdomains are rejected for this project.

## Verification limits

Current CARTO docs and key-registration instructions were checked on 7 November 2026. Automated configuration tests cover no-key behavior, correct key encoding and credits, rejection of the blocked OSM hosts, and custom URL/credit requirements. TypeScript and production build are checked. No CARTO key has been configured in this session, so successful live tile loading is not yet verified. Data-layer markers remain independent of the tile provider.
