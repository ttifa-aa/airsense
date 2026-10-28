// Table with one row per station, updates with the feed
function StationTable({ rows }) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Station</th>
            <th>AQI</th>
            <th>Category</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.displayName}</td>
              {row.aqi === null ? (
                <>
                  <td className="no-data">No data</td>
                  <td className="no-data">No data</td>
                </>
              ) : (
                <>
                  <td>
                    <strong>{row.aqi}</strong>
                  </td>
                  <td>
                    <span className="dot" style={{ background: row.color }}></span>
                    {row.category}
                  </td>
                </>
              )}
              <td>{row.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StationTable;
