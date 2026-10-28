import { useEffect, useState } from "react";
import DataPanel from "./components/DataPanel";
import MapPage from "./map/MapPage";
import "./App.css";

const tabFromHash = () => (window.location.hash === "#map" ? "map" : "dashboard");

export default function App() {
  const [tab, setTab] = useState(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <nav className="app-nav" aria-label="Main">
        <span className="app-brand">AirSense</span>
        <a href="#dashboard" className={tab === "dashboard" ? "active" : ""} aria-current={tab === "dashboard" ? "page" : undefined}>Dashboard</a>
        <a href="#map" className={tab === "map" ? "active" : ""} aria-current={tab === "map" ? "page" : undefined}>Hotspot map</a>
      </nav>
      {tab === "map" ? <MapPage /> : <DataPanel />}
    </>
  );
}
