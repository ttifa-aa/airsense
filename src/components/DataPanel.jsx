import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useAirQualityData } from "../hooks/useAirQualityData";
import StationSelector from "./StationSelector";
import StatusMessage, { statusFor } from "./StatusMessage";
import "./dashboard.css";

const fmt = (d) => d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
const num = (x) => (x == null ? "—" : x.toFixed(1));

// Indian AQI categories
const category = (v) =>
  v <= 50 ? { name: "Good", color: "#16a34a" }
  : v <= 100 ? { name: "Satisfactory", color: "#65a30d" }
  : v <= 200 ? { name: "Moderate", color: "#d97706" }
  : v <= 300 ? { name: "Poor", color: "#ea580c" }
  : v <= 400 ? { name: "Very poor", color: "#dc2626" }
  : { name: "Severe", color: "#7f1d1d" };

const hotspotText = (h) =>
  ({ not_elevated: "Not elevated", high_AQI_unclustered: "High AQI, not in a cluster" }[h.label] ??
    (h.label ? h.label.replace(/_/g, " ") : `Cluster ${h.cluster ?? "n/a"}`));

// One tick per January 1st so each year label appears once.
const yearTicks = (from, to) => {
  const out = [];
  for (let y = from.getFullYear() + 1; y <= to.getFullYear(); y++) out.push(new Date(y, 0, 1).getTime());
  return out;
};

const Card = ({ k, v, small, color }) => (
  <div className="card">
    <div className="k">{k}</div>
    <div className={`v${small ? " small" : ""}`} style={color ? { color } : undefined}>{v}</div>
  </div>
);

export default function DataPanel() {
  const d = useAirQualityData();
  const header = (
    <>
      <h1>Hyderabad Air Quality</h1>
      <p className="sub">Hourly AQI from 11 monitoring stations · historical data, 2017–2023</p>
    </>
  );
  const blocked = statusFor(d.readings, "air quality readings");
  if (blocked) return <div className="dash">{header}{blocked}</div>;
  if (!d.stations.length) return <div className="dash">{header}<StatusMessage kind="empty">No valid readings found in the file.</StatusMessage></div>;

  const s = d.summary;
  const cat = s && category(s.latest.value);
  return (
    <div className="dash">
      {header}
      <div className="toolbar">
        <StationSelector stations={d.stations} value={d.station} onChange={d.setStation} />
        {cat && <span className="badge" style={{ background: cat.color }}>Latest: {cat.name}</span>}
      </div>
      {d.droppedRows > 0 && (
        <StatusMessage kind="missing">{d.droppedRows} rows with missing or invalid values were skipped.</StatusMessage>
      )}

      {!s ? (
        <StatusMessage kind="empty">No readings for this station.</StatusMessage>
      ) : (
        <>
          <div className="cards">
            <Card k="Latest AQI" v={num(s.latest.value)} color={cat.color} />
            <Card k="Average" v={num(s.avg)} />
            <Card k="Max" v={num(s.max)} />
            <Card k="Readings" v={s.count.toLocaleString("en-IN")} />
            <Card k="Date range" v={`${fmt(s.from)} – ${fmt(s.to)}`} small />
          </div>
          <div className="panel">
            <h3>AQI over time — {d.station}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.chartData.map((p) => ({ t: p.ts.getTime(), AQI: +p.value.toFixed(1) }))}>
                <defs>
                  <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time"
                       ticks={yearTicks(s.from, s.to)} tickFormatter={(t) => new Date(t).getFullYear()} />
                <YAxis /><Tooltip labelFormatter={(t) => fmt(new Date(t))} />
                <Area dataKey="AQI" stroke="#2563eb" strokeWidth={2} fill="url(#aqiFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="muted">Long histories are averaged into about 400 points so the chart stays fast.</p>
          </div>
        </>
      )}

      <div className="panel">
        <h3>Next-hour prediction (Linear Regression)</h3>
        {statusFor(d.preds, "predictions.csv") ??
          (d.metrics ? (
            <div className="row">
              <div className="stat"><div className="k">This station · MAE</div><div className="v">{num(d.metrics.mae)}</div></div>
              <div className="stat"><div className="k">This station · RMSE</div><div className="v">{num(d.metrics.rmse)}</div></div>
              <div className="stat"><div className="k">Test points</div><div className="v">{d.metrics.n.toLocaleString("en-IN")}</div></div>
            </div>
          ) : <StatusMessage kind="empty">No predictions for this station (the test period only covers some stations).</StatusMessage>)}
        {d.overall && (
          <p className="muted">Overall, all stations: MAE {num(d.overall.mae)} · RMSE {num(d.overall.rmse)}
            {d.overall.n && ` · ${d.overall.n.toLocaleString("en-IN")} test rows`}</p>
        )}
      </div>

      <div className="panel">
        <h3>Hotspot analysis (DBSCAN)</h3>
        {statusFor(d.spots, "hotspots.csv") ??
          (d.stationHotspot ? (
            <div className="row">
              <div className="stat"><div className="k">Result</div><div className="v">{hotspotText(d.stationHotspot)}</div></div>
              {d.stationHotspot.meanAqi != null && <div className="stat"><div className="k">Mean AQI</div><div className="v">{d.stationHotspot.meanAqi}</div></div>}
              {d.stationHotspot.pctAbove100 != null && <div className="stat"><div className="k">Hours above 100</div><div className="v">{d.stationHotspot.pctAbove100}%</div></div>}
              {d.stationHotspot.name && <div className="stat"><div className="k">Station</div><div className="v" style={{ fontSize: 15 }}>{d.stationHotspot.name}</div></div>}
            </div>
          ) : <StatusMessage kind="empty">This station isn't in the hotspot results.</StatusMessage>)}
      </div>

      <footer>
        Data: <a href="https://data.opencity.in/dataset/hyderabad-hourly-air-quality-reports" target="_blank" rel="noreferrer">OpenCity</a>
        {" · "}<a href="https://colab.research.google.com/drive/1tsFeYzGbcV1YE1gBb6WkuC_hFUoGvwY8?usp=sharing" target="_blank" rel="noreferrer">Colab notebook</a>
        {" · "}<a href="#map">AirSense map</a>
      </footer>
    </div>
  );
}
