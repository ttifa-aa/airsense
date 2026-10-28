// Change these settings to match your CSV files.

// true = use the small made-up sample files, false = use the real data
export const USE_SAMPLE_DATA = false;

// Where the CSV files live (inside the public folder)
export const REAL_READINGS_FILE = "/cleaned_air_quality.csv";
export const SAMPLE_READINGS_FILE = "/sample/sample_air_quality.csv";
export const HOTSPOTS_FILE = "/hotspots.csv"; // optional

export const READINGS_FILE = USE_SAMPLE_DATA ? SAMPLE_READINGS_FILE : REAL_READINGS_FILE;

// Column names in the readings CSV
export const STATION_COLUMN = "station";
export const TIMESTAMP_COLUMN = "timestamp";
export const AQI_COLUMN = "AQI";

// Column names in hotspots.csv. cluster >= 0 = DBSCAN hotspot cluster, -1 = high AQI but not in a cluster,
// -2 = not elevated. "elevated" (True/False) marks every station with high AQI.
export const HOTSPOT_STATION_COLUMN = "station";
export const HOTSPOT_CLUSTER_COLUMN = "cluster";
export const HOTSPOT_ELEVATED_COLUMN = "elevated";

// Which part of the data to replay
export const REPLAY_START_DATE = "2023-01-01";
export const REPLAY_DAYS = 7;

// How often the feed moves to the next timestamp (seconds)
export const INTERVAL_SECONDS = 5;

// Map centre (Hyderabad) and zoom
export const MAP_CENTER = [17.385, 78.4867];
export const MAP_ZOOM = 11;
