# AirSense – Low-Cost Real-Time Air Pollution Monitoring & Hotspot Detection (Hyderabad)

One web app, two views, driven by the same data files:

| View | What it shows |
|---|---|
| **Dashboard** (`#dashboard`) | Per-station AQI trend (2017–2023), summary cards, next-hour prediction accuracy (Linear Regression), hotspot result (DBSCAN) |
| **Hotspot map** (`#map`) | Leaflet map of the 11 stations, simulated live feed (replays 1–7 Jan 2023 hour by hour), hotspot / high-AQI stations outlined, station table |

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```
Needs internet for the OpenStreetMap map tiles. Node 20+.

## Data flow
```
data-pipeline/rawdata/*.csv --preprocess.py--> cleaned_air_quality.csv --+
(OpenCity hourly reports)                                                +--> public/ --> Dashboard + Map
ml/hotspot_dbscan.py --> hotspots.csv (+ hotspot_map.png)                  --+
Colab notebook (regression) --> predictions.csv, evaluation_metrics.txt   --+
```
All shared files live once, in `public/`:
`cleaned_air_quality.csv` (timestamp, station, AQI) · `predictions.csv` · `hotspots.csv` · `evaluation_metrics.txt`

To regenerate the cleaned data: `cd data-pipeline && pip install -r requirements.txt && python preprocess.py`, then copy the output to `public/`.

## Hotspot detection (`ml/hotspot_dbscan.py`)
DBSCAN (haversine, eps = 10 km, min_samples = 2) on stations whose AQI exceeds 100 for >= 30% of hours in 2023, the only full year with all 11 stations reporting. Run `cd ml && pip install -r requirements.txt && python hotspot_dbscan.py`, then copy the new `hotspots.csv` to `public/`. Verified to reproduce the shipped file exactly.

## Hotspot labels (`hotspots.csv`, `cluster` column)
`0, 1, ...` = DBSCAN hotspot cluster · `-1` = high AQI but not in a cluster · `-2` = not elevated.
The map outlines every station with `elevated = True` (clusters and unclustered high-AQI stations).

## Layout
```
src/App.jsx                    nav shell (Dashboard | Hotspot map)
src/components, hooks, data/   dashboard (unchanged apart from small fixes)
src/map/                       map app (was a separate project); MapPage.jsx = its old App.jsx
src/map/config.js              replay window, speed, column names, data paths
```

## Changes made when combining the three submissions
- Added `ml/hotspot_dbscan.py` (only change: input path was a Colab `/content/...` path).
- Single Vite + React 19 project; `react-leaflet` upgraded 4 -> 5 (v4 requires React 18).
- Map reads the shared `/cleaned_air_quality.csv` and `/hotspots.csv` (no duplicate copies); the map's sample file is kept in `public/sample/`.
- Map station coordinates replaced with the verified ones from `hotspots.csv` (the old ones were approximate and unverified).
- Map now honours the `elevated` column so Zoo Park and Pashamylaram are flagged like on the dashboard.
- Dashboard: Safari-safe timestamp parsing; `Math.max(...array)` replaced with `reduce` (huge spread arrays can overflow in some browsers); footer map link now goes to the in-app map.
- CSS: map header title colour fixed (dashboard's global `h1` colour was overriding it); `lint` script scoped to `src`.
