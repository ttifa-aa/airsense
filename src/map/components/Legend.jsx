import { AQI_BANDS } from "../utils/aqi.js";

// Small legend card shown on the bottom-right of the map
function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">AQI</div>
      {AQI_BANDS.map((band) => (
        <div key={band.category} className="legend-item">
          <span className="swatch" style={{ background: band.color }}></span>
          {band.category} ({band.range})
        </div>
      ))}
      <div className="legend-item">
        <span className="swatch" style={{ background: "#9e9e9e" }}></span>
        No data
      </div>
      <div className="legend-item">
        <span className="swatch hotspot-swatch"></span>
        Hotspot / high-AQI station
      </div>
    </div>
  );
}

export default Legend;
