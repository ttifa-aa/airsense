import { useEffect, useMemo, useState } from "react";
import {
  fetchCsv, normalizeReadings, normalizePredictions, normalizeHotspots,
  computeMetrics, downsample,
} from "../data/dataLoader";

const idle = { status: "loading", error: null };

/**
 * Loads the three agreed files and exposes everything filtered by the selected station.
 * status per file: "loading" | "ready" | "missing" | "error"
 * Only the cleaned file is required; predictions/hotspots show a "missing" message
 * until Members 2 and 3 hand over their files.
 */
export function useAirQualityData({
  cleanedUrl = "/cleaned_air_quality.csv",
  predictionsUrl = "/predictions.csv",
  hotspotsUrl = "/hotspots.csv",
  metricsUrl = "/evaluation_metrics.txt",
  columns = {},
} = {}) {
  // Overall (all-station) MAE/RMSE from Member 2's evaluation_metrics.txt. Optional.
  const [overall, setOverall] = useState(null);
  useEffect(() => {
    fetch(metricsUrl)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        const mae = t.match(/MAE:\s*([\d.]+)/), rmse = t.match(/RMSE:\s*([\d.]+)/);
        const rows = t.match(/Testing rows:\s*(\d+)/);
        setOverall(mae && rmse ? { mae: +mae[1], rmse: +rmse[1], n: rows ? +rows[1] : null } : null);
      })
      .catch(() => setOverall(null));
  }, [metricsUrl]);

  const [readings, setReadings] = useState({ ...idle, data: null });
  const [preds, setPreds] = useState({ ...idle, data: null });
  const [spots, setSpots] = useState({ ...idle, data: null });
  const [station, setStation] = useState("");

  useEffect(() => {
    let off = false;
    const run = (url, normalize, set, onOk) => {
      set({ ...idle, data: null });
      fetchCsv(url)
        .then(({ rows, headers }) => {
          const data = normalize(rows, headers, columns);
          if (!off) { set({ status: "ready", error: null, data }); onOk?.(data); }
        })
        .catch((e) => !off && set({ status: e.code === "missing" ? "missing" : "error", error: e.message, data: null }));
    };
    run(cleanedUrl, normalizeReadings, setReadings, (d) => setStation((s) => s || d.stations[0] || ""));
    run(predictionsUrl, normalizePredictions, setPreds);
    run(hotspotsUrl, normalizeHotspots, setSpots);
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanedUrl, predictionsUrl, hotspotsUrl]);

  const stationReadings = useMemo(
    () => (readings.data ? readings.data.readings.filter((r) => r.station === station) : []),
    [readings.data, station]
  );
  const chartData = useMemo(() => downsample(stationReadings), [stationReadings]);

  const stationPreds = useMemo(() => {
    if (!preds.data) return [];
    // Predictions without a station column apply to the whole dataset.
    return preds.data.hasStation ? preds.data.predictions.filter((p) => p.station === station) : preds.data.predictions;
  }, [preds.data, station]);

  const summary = useMemo(() => {
    if (!stationReadings.length) return null;
    const v = stationReadings.map((r) => r.value);
    return {
      count: v.length,
      avg: v.reduce((a, b) => a + b, 0) / v.length,
      max: v.reduce((a, b) => (b > a ? b : a), -Infinity),
      min: v.reduce((a, b) => (b < a ? b : a), Infinity),
      latest: stationReadings[stationReadings.length - 1],
      from: stationReadings[0].ts,
      to: stationReadings[stationReadings.length - 1].ts,
    };
  }, [stationReadings]);

  return {
    readings, preds, spots, overall,
    stations: readings.data?.stations ?? [],
    droppedRows: readings.data?.dropped ?? 0,
    station, setStation,
    summary, chartData,
    stationPreds,
    metrics: computeMetrics(stationPreds),
    stationHotspot: spots.data?.hotspots.find((h) => h.station === station) ?? null,
  };
}
