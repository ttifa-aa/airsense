const styles = {
  loading: { bg: "#eef4ff", fg: "#1e3a8a", icon: "⏳" },
  missing: { bg: "#fff8e1", fg: "#7a5b00", icon: "ℹ️" },
  error:   { bg: "#fdecea", fg: "#8a1c1c", icon: "⚠️" },
  empty:   { bg: "#f3f4f6", fg: "#374151", icon: "∅" },
};

export default function StatusMessage({ kind, children }) {
  const s = styles[kind] ?? styles.empty;
  return (
    <div role={kind === "error" ? "alert" : "status"}
         style={{ background: s.bg, color: s.fg, padding: "10px 14px", borderRadius: 8, margin: "8px 0" }}>
      {s.icon} {children}
    </div>
  );
}

// Returns the right message for a loader state, or null when ready.
export function statusFor(state, label) {
  if (state.status === "loading") return <StatusMessage kind="loading">Loading {label}…</StatusMessage>;
  if (state.status === "missing") return <StatusMessage kind="missing">{label} isn't available yet. It will appear once the file is added.</StatusMessage>;
  if (state.status === "error") return <StatusMessage kind="error">Couldn't load {label}: {state.error}</StatusMessage>;
  return null;
}
