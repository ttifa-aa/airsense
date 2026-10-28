export default function StationSelector({ stations, value, onChange, disabled }) {
  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span>Station</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || !stations.length}>
        {stations.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}
