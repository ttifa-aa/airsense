// CPCB AQI bands: colour + category for a given AQI value

const GREY = "#9e9e9e";

// Used by the legend too
export const AQI_BANDS = [
  { max: 50, category: "Good", color: "#006400", range: "0-50" },
  { max: 100, category: "Satisfactory", color: "#7ed957", range: "51-100" },
  { max: 200, category: "Moderate", color: "#ffd800", range: "101-200" },
  { max: 300, category: "Poor", color: "#ff8c00", range: "201-300" },
  { max: 400, category: "Very Poor", color: "#e53935", range: "301-400" },
  { max: Infinity, category: "Severe", color: "#7b0000", range: "401-500" },
];

function findBand(aqi) {
  if (aqi === null || aqi === undefined) return null;
  return AQI_BANDS.find((band) => aqi <= band.max);
}

export function getColor(aqi) {
  const band = findBand(aqi);
  return band ? band.color : GREY;
}

export function getCategory(aqi) {
  const band = findBand(aqi);
  return band ? band.category : "No data";
}
