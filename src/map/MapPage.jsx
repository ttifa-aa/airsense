import { useState, useEffect } from "react";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import StationMap from "./components/StationMap.jsx";
import StationTable from "./components/StationTable.jsx";
import Legend from "./components/Legend.jsx";
import { getColor, getCategory } from "./utils/aqi.js";
import stations from "./data/stations.json";
import {
  READINGS_FILE,
  HOTSPOTS_FILE,
  STATION_COLUMN,
  TIMESTAMP_COLUMN,
  AQI_COLUMN,
  HOTSPOT_STATION_COLUMN,
  HOTSPOT_CLUSTER_COLUMN,
  HOTSPOT_ELEVATED_COLUMN,
  REPLAY_START_DATE,
  REPLAY_DAYS,
  INTERVAL_SECONDS,
} from "./config.js";

// lower case and remove spaces so "Zoo Park" matches "Zoopark"
function cleanName(name) {
  return String(name).toLowerCase().replace(/\s+/g, "");
}

// end of the replay window as a "YYYY-MM-DD" text (start + replay days)
function getEndDate() {
  const end = new Date(REPLAY_START_DATE + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + REPLAY_DAYS);
  return end.toISOString().slice(0, 10);
}

function MapPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timestamps, setTimestamps] = useState([]); // sorted list of timestamps in the window
  const [readings, setReadings] = useState({}); // readings[timestamp][cleanStationName] = AQI
  const [hotspots, setHotspots] = useState({}); // hotspots[cleanStationName] = { cluster, elevated }
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  // load and parse the readings CSV once
  useEffect(() => {
    Papa.parse(READINGS_FILE, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const columns = result.meta.fields || [];
        const columnsOk =
          columns.includes(STATION_COLUMN) &&
          columns.includes(TIMESTAMP_COLUMN) &&
          columns.includes(AQI_COLUMN);
        if (!columnsOk) {
          // file missing (or wrong column names)
          setError("Could not load data file");
          setLoading(false);
          return;
        }

        const start = REPLAY_START_DATE;
        const end = getEndDate();
        const byTime = {};
        const unknownStations = {};
        const knownNames = stations.map((s) => cleanName(s.name));

        for (const row of result.data) {
          const time = (row[TIMESTAMP_COLUMN] || "").trim();
          const station = (row[STATION_COLUMN] || "").trim();
          const aqi = parseFloat(row[AQI_COLUMN]);

          // skip bad rows
          if (!station || isNaN(aqi)) continue;
          if (!/^\d{4}-\d{2}-\d{2}/.test(time) || isNaN(new Date(time.replace(" ", "T")))) continue;

          if (!knownNames.includes(cleanName(station))) {
            unknownStations[station] = true;
          }

          // keep only rows inside the replay window
          const day = time.slice(0, 10);
          if (day < start || day >= end) continue;

          if (!byTime[time]) byTime[time] = {};
          byTime[time][cleanName(station)] = aqi;
        }

        for (const name of Object.keys(unknownStations)) {
          console.warn("No coordinates for station in CSV: " + name);
        }

        const sorted = Object.keys(byTime).sort();
        if (sorted.length === 0) {
          setError("No data found");
        }
        setReadings(byTime);
        setTimestamps(sorted);
        setLoading(false);
      },
      error: () => {
        setError("Could not load data file");
        setLoading(false);
      },
    });
  }, []);

  // optional hotspots file, ignore it if anything goes wrong
  useEffect(() => {
    Papa.parse(HOTSPOTS_FILE, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const columns = result.meta.fields || [];
        if (!columns.includes(HOTSPOT_STATION_COLUMN) || !columns.includes(HOTSPOT_CLUSTER_COLUMN)) {
          return;
        }
        const found = {};
        for (const row of result.data) {
          const cluster = parseInt(row[HOTSPOT_CLUSTER_COLUMN]);
          if (!row[HOTSPOT_STATION_COLUMN] || isNaN(cluster)) continue;
          const elevated = String(row[HOTSPOT_ELEVATED_COLUMN]).trim().toLowerCase() === "true";
          found[cleanName(row[HOTSPOT_STATION_COLUMN])] = { cluster, elevated };
        }
        setHotspots(found);
      },
      error: () => {},
    });
  }, []);

  // the simulated live feed: go to the next timestamp every few seconds
  useEffect(() => {
    if (!playing || timestamps.length === 0) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % timestamps.length); // loop at the end
    }, INTERVAL_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [playing, timestamps]);

  function handleRestart() {
    setStep(0);
  }

  if (loading) {
    return <div className="message">Loading...</div>;
  }

  const currentTime = timestamps[step];

  // one row per station for the current timestamp
  const rows = stations.map((s) => {
    const key = cleanName(s.name);
    const aqiValue = currentTime && readings[currentTime] ? readings[currentTime][key] : undefined;
    const aqi = aqiValue === undefined ? null : aqiValue;
    return {
      name: s.name,
      displayName: s.displayName,
      lat: s.lat,
      lng: s.lng,
      aqi: aqi,
      category: getCategory(aqi),
      color: getColor(aqi),
      timestamp: currentTime || "-",
      cluster: hotspots[key] === undefined ? null : hotspots[key].cluster,
      elevated: hotspots[key] === undefined ? false : hotspots[key].elevated,
    };
  });

  return (
    <div className="app">
      <header>
        <div className="header-inner">
          <h1>Hyderabad AQI Map</h1>
          <p>Station map with simulated live feed</p>
        </div>
      </header>

      <main>
        {error ? (
          <div className="message error">{error}</div>
        ) : (
          <>
            <div className="notice">
              Simulated live feed: replaying historical data, not real-time measurements.
            </div>

            <div className="controls">
              <div>
                <div className="small-label">Current timestamp</div>
                <div className="current-time">{currentTime}</div>
                <div className="small-label">
                  Step {step + 1} of {timestamps.length}
                </div>
              </div>
              <div className="buttons">
                <button onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
                <button onClick={handleRestart}>Restart</button>
              </div>
            </div>

            <div className="map-wrap">
              <StationMap rows={rows} />
              <Legend />
            </div>

            <StationTable rows={rows} />
          </>
        )}
      </main>
    </div>
  );
}

export default MapPage;
