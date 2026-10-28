import Papa from "papaparse";

// Column-name guesses, so this works even if teammates name columns differently.
// If auto-detect picks wrong, pass `columns` to useAirQualityData to override.
const GUESSES = {
  timestamp: ["timestamp", "datetime", "date_time", "date", "time"],
  station: ["station", "station_name", "area", "location", "name"],
  value: ["aqi", "pm2.5", "pm25", "pm2_5", "value"],
  actual: ["actual", "y_true", "actual_aqi", "actual_pm2.5"],
  predicted: ["predicted", "prediction", "y_pred", "predicted_aqi", "predicted_pm2.5"],
  cluster: ["cluster", "cluster_label", "label", "hotspot"],
  lat: ["latitude", "lat"],
  lng: ["longitude", "lng", "lon", "long"],
};

export function detectColumns(headers) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const found = {};
  for (const [key, names] of Object.entries(GUESSES)) {
    const i = lower.findIndex((h) => names.includes(h));
    if (i >= 0) found[key] = headers[i];
  }
  return found;
}

export function parseTimestamp(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD-MM-YYYY or DD/MM/YYYY [HH:mm[:ss]]
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const d = m
    ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))
    : new Date(s.replace(" ", "T"));
  return isNaN(d) ? null : d;
}

export async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Could not load ${url} (HTTP ${res.status})`);
    err.code = res.status === 404 ? "missing" : "error";
    throw err;
  }
  const text = await res.text();
  // Dev servers often return index.html for a missing file with status 200.
  if (text.trimStart().startsWith("<")) {
    const err = new Error(`${url} was not found`);
    err.code = "missing";
    throw err;
  }
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (!data.length) {
    const err = new Error(`${url} is empty`);
    err.code = "error";
    throw err;
  }
  return { rows: data, headers: meta.fields };
}

// Cleaned readings -> [{ts, station, value}] + sorted station list + count of dropped rows.
export function normalizeReadings(rows, headers, override = {}) {
  const c = { ...detectColumns(headers), ...override };
  if (!c.timestamp || !c.station || !c.value) {
    const err = new Error(
      `Need timestamp, station and AQI columns. Found: ${headers.join(", ")}. Pass a "columns" override.`
    );
    err.code = "error";
    throw err;
  }
  const out = [];
  let dropped = 0;
  for (const r of rows) {
    const ts = parseTimestamp(r[c.timestamp]);
    const value = parseFloat(r[c.value]);
    const station = (r[c.station] || "").trim();
    if (!ts || !station || !isFinite(value) || value < 0) {
      dropped++;
      continue;
    }
    out.push({ ts, station, value });
  }
  out.sort((a, b) => a.ts - b.ts);
  const stations = [...new Set(out.map((r) => r.station))].sort();
  return { readings: out, stations, dropped, columns: c };
}

export function normalizePredictions(rows, headers, override = {}) {
  const c = { ...detectColumns(headers), ...override };
  if (!c.actual || !c.predicted) {
    const err = new Error(`predictions.csv needs actual and predicted columns. Found: ${headers.join(", ")}`);
    err.code = "error";
    throw err;
  }
  const predictions = rows
    .map((r) => ({
      ts: c.timestamp ? parseTimestamp(r[c.timestamp]) : null,
      station: c.station ? (r[c.station] || "").trim() : null,
      actual: parseFloat(r[c.actual]),
      predicted: parseFloat(r[c.predicted]),
    }))
    .filter((r) => isFinite(r.actual) && isFinite(r.predicted));
  return { predictions, hasStation: !!c.station };
}

export function normalizeHotspots(rows, headers, override = {}) {
  const c = { ...detectColumns(headers), ...override };
  if (!c.station) {
    const err = new Error(`hotspots.csv needs a station column. Found: ${headers.join(", ")}`);
    err.code = "error";
    throw err;
  }
  return {
    hotspots: rows.map((r) => ({
      station: (r[c.station] || "").trim(),
      lat: c.lat ? parseFloat(r[c.lat]) : null,
      lng: c.lng ? parseFloat(r[c.lng]) : null,
      cluster: c.cluster ? r[c.cluster] : null,
      // Optional extras from Member 3's file (null if the columns aren't there)
      label: r.label ?? null,
      name: r.station_name ?? null,
      meanAqi: r.mean_aqi != null ? parseFloat(r.mean_aqi) : null,
      pctAbove100: r.pct_hours_above_100 != null ? parseFloat(r.pct_hours_above_100) : null,
    })),
  };
}

// MAE / RMSE computed in the browser so cards work even without a metrics file.
export function computeMetrics(preds) {
  if (!preds.length) return null;
  const n = preds.length;
  const mae = preds.reduce((s, p) => s + Math.abs(p.actual - p.predicted), 0) / n;
  const rmse = Math.sqrt(preds.reduce((s, p) => s + (p.actual - p.predicted) ** 2, 0) / n);
  return { mae, rmse, n };
}

// Years of hourly data is too heavy to chart raw: average into at most `maxPoints` buckets.
export function downsample(readings, maxPoints = 400) {
  if (readings.length <= maxPoints) return readings.map((r) => ({ ts: r.ts, value: r.value }));
  const size = Math.ceil(readings.length / maxPoints);
  const out = [];
  for (let i = 0; i < readings.length; i += size) {
    const chunk = readings.slice(i, i + size);
    out.push({
      ts: chunk[Math.floor(chunk.length / 2)].ts,
      value: chunk.reduce((s, r) => s + r.value, 0) / chunk.length,
    });
  }
  return out;
}
