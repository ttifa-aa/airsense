
import pandas as pd
from pathlib import Path

df = pd.read_csv("cleaned_air_quality.csv")

output_dir = Path("station_data")
output_dir.mkdir(exist_ok=True)

for station, data in df.groupby("station"):
    filename = station.lower().replace(" ", "_") + ".csv"
    data.to_csv(output_dir / filename, index=False)

print("Created separate CSV files for each station.")
