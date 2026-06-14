# Makkah – Jeddah – Taif DEM Viewer v2

Rainfall-driven flood prediction pilot for the Saudi Arabia Kingdom-wide flood-risk system.

## What's new in v2

The original viewer used a shaded-relief image as if it were elevation, and the flood tool was a simple bathtub (fill-to-level) slider. v2 replaces both:

- **Real terrain** from Copernicus GLO-30 (free, open license), reprojected to UTM 37N at 30 m, covering Makkah–Jeddah–Taif (174.4 × 126.4 km, elevations −9.8 to 2,610.9 m).
- **Rainfall-runoff flood model** instead of bathtub: you specify storm depth (mm), duration (h), and soil infiltration class. The model computes runoff, routes it through the D8 flow network derived from the real DEM, estimates peak discharge per channel, and maps inundation depth using regime equations.

## How to run

**This app does not work if you double-click `index.html` directly** — browsers block local data loading on the `file://` protocol, so the page will hang on "Loading terrain…". You must run a local web server.

### Easiest: one-click launchers

- **Windows**: double-click `start_windows.bat`
- **macOS / Linux**: double-click `start_mac_linux.sh` (or run `./start_mac_linux.sh` in a terminal)

They start a local server and open the viewer in your browser automatically. Requires Python 3 (already installed on Mac/Linux; on Windows, get it from [python.org](https://www.python.org/downloads/) and check "Add Python to PATH").

### Manual

```bash
cd dem_viewer_v2
python3 -m http.server 8765
# then open http://localhost:8765
```

Any static file server works — no backend required.

## Controls

- **Visualization**: Elevation / Hillshade / Slope / Aspect basemaps, optional contour lines, 3D mode
- **Profile tool**: click two points to draw an elevation cross-section
- **Flood model**:
  - Rainfall depth (1–250 mm)
  - Storm duration (0.5–24 h)
  - Soil infiltration class (Low arid / Medium / High / Very high)
  - "Run flood model" → simulates inundation
  - "Clear" → removes overlay

## Calibrated scenarios

| Scenario | Rainfall | Flooded area | Max depth | Peak Q |
|---|---|---|---|---|
| Drizzle | 5 mm / 6 h | 4.7 km² | 0.89 m | 52 m³/s |
| Moderate storm | 15 mm / 3 h | 36.2 km² | 1.59 m | 368 m³/s |
| Heavy storm | 30 mm / 2 h | 100.8 km² | 2.23 m | 1,143 m³/s |
| Jeddah-2009-like | 100 mm / 4 h | 155.9 km² | 2.62 m | 1,950 m³/s |
| Extreme | 150 mm / 4 h | 214.0 km² | 2.96 m | 2,935 m³/s |

## Model details

Pipeline:

1. **DEM**: Copernicus GLO-30 → pit-filled with pysheds
2. **Hydrology**: D8 flow direction + flow accumulation (saved as flowdir.bin, flowacc.bin)
3. **Runoff generation**: SCS-style initial abstraction, then runoff coefficient by soil class, modulated by local slope
4. **Routing**: runoff volume accumulated downstream along D8 network
5. **Channel definition**: only cells with ≥ 50-cell upstream contributing area (≈ 4.5 ha) are treated as channels
6. **Peak discharge**: Q_peak = (V / T) × 2.5 (triangular hydrograph peak factor)
7. **Depth**: Leopold-style regime equations — width w = 2.5·Q^0.5, depth d = 0.27·Q^0.30
8. **Inundation threshold**: cells flagged if depth ≥ 0.30 m (cars float). Sea cells (elev ≤ 1 m) excluded.

## Data files

- `data/elevation.bin` — Int16 LE, 1600 × 1152
- `data/flowdir.bin` — Int8 dx,dy interleaved (D8)
- `data/flowacc.bin` — Uint32 LE flow accumulation
- `data/hillshade.png`, `slope.png`, `aspect.png`, `color.png` — basemap renders
- `data/metadata.json` — projection, bounds, statistics

## Source DEM

Copernicus GLO-30 Digital Surface Model, downloaded from AWS Open Data:
`https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_<TILE>_DEM/<file>.tif`

License: free for any use, including commercial.

## Limitations & next steps

This is a screening tool, not an engineering flood model. Known limitations:

- 30 m DEM smooths narrow wadi channels — local depths may be underestimated in tight gorges
- No explicit dam/reservoir storage yet (planned: OSM dam layer + capacity tracking)
- Uniform rainfall over AOI (no spatial storm pattern)
- No baseflow, no hydrograph attenuation between cells
- Not validated against observed flood extents

Roadmap for Kingdom-wide expansion:

1. Add Wadi Naman, Wadi Fatimah, and other dam locations from OSM with reservoir capacity
2. Hindcast validation against Jeddah 2009 and 2022 floods using Sentinel-1 SAR observations
3. Scale to full Kingdom by tiling on HydroBASINS level-7 watersheds

---
Built on Copernicus GLO-30 DEM (© European Space Agency, free license).
