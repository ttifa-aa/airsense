import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { MAP_CENTER, MAP_ZOOM } from "../config.js";

// rows = one object per station (see App.jsx)
function StationMap({ rows }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {rows.map((row) => {
        const inCluster = row.cluster !== null && row.cluster >= 0;
        const isHotspot = inCluster || row.elevated;
        return (
          <CircleMarker
            key={row.name}
            center={[row.lat, row.lng]}
            radius={14}
            pathOptions={{
              fillColor: row.color,
              fillOpacity: 0.85,
              color: isHotspot ? "#1a1a2e" : "#ffffff",
              weight: isHotspot ? 4 : 1,
              dashArray: isHotspot ? "6 4" : null,
            }}
          >
            <Popup>
              <div className="popup-name">{row.displayName}</div>
              {row.aqi === null ? (
                <div className="no-data">No data</div>
              ) : (
                <>
                  <div className="popup-aqi">
                    {row.aqi} <span>AQI</span>
                  </div>
                  <span
                    className="badge"
                    style={{ background: row.color, color: row.aqi > 50 && row.aqi <= 200 ? "#222" : "#fff" }}
                  >
                    {row.category}
                  </span>
                </>
              )}
              <div className="popup-time">{row.timestamp}</div>
              {isHotspot && (
                <div className="popup-hotspot">
                  {inCluster ? `Hotspot cluster ${row.cluster}` : "High AQI (not in a cluster)"}
                </div>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default StationMap;
