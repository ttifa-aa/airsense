"""
DBSCAN hotspot detection - Hyderabad stations (AirSense, Member 3)

Input : cleaned_air_quality.csv  (timestamp, station, AQI)  - AQI only, NO PM2.5
Output: hotspots.csv, hotspot_map.png

NOTE ON COORDINATES: station coordinates were checked manually by the user
(Google Maps / station pages).
"""
import numpy as np, pandas as pd
from sklearn.cluster import DBSCAN
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

CSV = "../public/cleaned_air_quality.csv"   # was a Colab path
START, END = "2023-01-01", "2023-12-31 23:59"   # only full year where all 11 stations report
ELEVATED_PCT = 30.0     # station is "elevated" if >=30% of hours have AQI > 100
AQI_LIMIT = 100
EPS_KM, MIN_SAMPLES = 10.0, 2

# station -> (full name, lat, lon, verified)
COORDS = {
 "Bollaram":          ("Bollaram Industrial Area (IDA Bollaram)", 17.5403, 78.3502, True),
 "Patancheru":        ("ICRISAT Patancheru",                       17.5115, 78.2751, True),
 "Pashamylaram":      ("IDA Pashamylaram",                         17.5310, 78.1688, True),
 "Centraluniversity": ("Central University (HCU)", 17.4599, 78.3320, True),
 "Zoopark":           ("Nehru Zoological Park",                    17.3506, 78.4431, True),
 "Kokapet":           ("Kokapet",                                  17.3996, 78.3328, True),
 "Nacharam":          ("Nacharam (TSIIC IALA)",                    17.4386, 78.5649, True),
 "Ecilkapra":         ("ECIL Kapra",                               17.4725, 78.5701, True),
 "Malakpet":          ("New Malakpet",                             17.3671, 78.5094, True),
 "Iithkandi":         ("IITH Kandi",                               17.5961, 78.1253, True),
 "Kompally":          ("Kompally Municipal Office",                17.5445, 78.4888, True),
}

df = pd.read_csv(CSV, parse_dates=["timestamp"])
df = df[(df.timestamp >= START) & (df.timestamp <= END)]

stats = df.groupby("station").AQI.agg(
    hours="size", mean_aqi="mean",
    p90_aqi=lambda v: v.quantile(.9),
    pct_hours_above_100=lambda v: (v > AQI_LIMIT).mean() * 100).round(1).reset_index()
HOURS_2023 = 8760
stats["coverage_pct"] = (stats.hours / HOURS_2023 * 100).round(1)

c = pd.DataFrame([(k, *v) for k, v in COORDS.items()],
                 columns=["station", "station_name", "lat", "lon", "coords_verified"])
st = stats.merge(c, on="station", how="left")
assert st.lat.notna().all(), "station missing coordinates"

st["elevated"] = st.pct_hours_above_100 >= ELEVATED_PCT
sel = st[st.elevated].copy()

# DBSCAN with haversine metric (radians); eps in km -> radians
X = np.radians(sel[["lat", "lon"]].to_numpy())
lab = DBSCAN(eps=EPS_KM / 6371.0088, min_samples=MIN_SAMPLES,
             metric="haversine", algorithm="ball_tree").fit_predict(X)
sel["cluster"] = lab                      # -1 = noise (high AQI, no neighbours within eps)
st = st.merge(sel[["station", "cluster"]], on="station", how="left")
st["cluster"] = st.cluster.fillna(-2).astype(int)   # -2 = not elevated, not clustered

def role(x):
    return {-2: "not_elevated", -1: "high_AQI_unclustered"}.get(x, f"hotspot_cluster_{x}")
st["label"] = st.cluster.map(role)
out = st.sort_values(["cluster", "mean_aqi"], ascending=[True, False])
out[["station", "station_name", "lat", "lon", "coords_verified", "mean_aqi",
     "p90_aqi", "pct_hours_above_100", "hours", "coverage_pct", "elevated", "cluster", "label"]] \
    .to_csv("hotspots.csv", index=False)
print(out[["station", "mean_aqi", "pct_hours_above_100", "cluster", "label"]].to_string(index=False))

# sensitivity to eps
for e in (5, 8, 10, 15, 20):
    l = DBSCAN(eps=e/6371.0088, min_samples=MIN_SAMPLES, metric="haversine").fit_predict(X)
    print(f"eps={e:>2} km -> clusters={len(set(l)-{-1})}, noise={(l==-1).sum()}")

# sensitivity to the elevated-AQI threshold (eps fixed)
print("\nThreshold sensitivity (eps=%s km):" % EPS_KM)
for t in (25, 30, 40):
    q = st[st.pct_hours_above_100 >= t]
    if len(q) == 0:
        print(f"  >= {t}% -> no stations"); continue
    l = DBSCAN(eps=EPS_KM/6371.0088, min_samples=MIN_SAMPLES, metric="haversine").fit_predict(np.radians(q[["lat","lon"]].to_numpy()))
    print(f"  >= {t}% -> {len(q)} stations {sorted(q.station)}; clusters={len(set(l)-{-1})}, unclustered={(l==-1).sum()}")

# map
fig, ax = plt.subplots(figsize=(7, 6))
ne = out[out.cluster == -2]
ax.scatter(ne.lon, ne.lat, c="lightgrey", s=60, label="not elevated")
for cl in sorted(set(out.cluster) - {-2}):
    s = out[out.cluster == cl]
    ax.scatter(s.lon, s.lat, s=140, label=role(cl), marker="x" if cl == -1 else "o")
for _, r in out.iterrows():
    ax.annotate(r.station, (r.lon, r.lat), fontsize=7, xytext=(3, 3), textcoords="offset points")
ax.set_xlabel("lon"); ax.set_ylabel("lat"); ax.legend(fontsize=8)
ax.set_title(f"DBSCAN hotspots, 2023 (eps={EPS_KM} km, min_samples={MIN_SAMPLES})")
plt.tight_layout(); plt.savefig("hotspot_map.png", dpi=150)

""" 
output:
station  mean_aqi  pct_hours_above_100  cluster                label
         Nacharam      90.8                 24.7       -2         not_elevated
         Malakpet      78.2                  9.3       -2         not_elevated
        Ecilkapra      76.2                  9.0       -2         not_elevated
        Iithkandi      72.4                  7.8       -2         not_elevated
         Kompally      69.8                  5.4       -2         not_elevated
          Zoopark     104.1                 54.3       -1 high_AQI_unclustered
     Pashamylaram     102.2                 53.5       -1 high_AQI_unclustered
         Bollaram     109.7                 59.1        0    hotspot_cluster_0
          Kokapet      96.7                 30.4        0    hotspot_cluster_0
       Patancheru      90.4                 38.7        0    hotspot_cluster_0
Centraluniversity      86.0                 32.0        0    hotspot_cluster_0
eps= 5 km -> clusters=0, noise=6
eps= 8 km -> clusters=1, noise=4
eps=10 km -> clusters=1, noise=2
eps=15 km -> clusters=1, noise=0
eps=20 km -> clusters=1, noise=0

Threshold sensitivity (eps=10.0 km):
  >= 25% -> 6 stations ['Bollaram', 'Centraluniversity', 'Kokapet', 'Pashamylaram', 'Patancheru', 'Zoopark']; clusters=1, unclustered=2
  >= 30% -> 6 stations ['Bollaram', 'Centraluniversity', 'Kokapet', 'Pashamylaram', 'Patancheru', 'Zoopark']; clusters=1, unclustered=2
  >= 40% -> 3 stations ['Bollaram', 'Pashamylaram', 'Zoopark']; clusters=0, unclustered=3
"""
