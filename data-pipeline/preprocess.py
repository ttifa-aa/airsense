
import csv
import re
from pathlib import Path
import pandas as pd

DATA_DIR = Path("rawdata")
OUTPUT_FILE = "cleaned_air_quality.csv"
SUMMARY_FILE = "summary.txt"

records = []
files_processed = 0
files_skipped = []

for file in sorted(DATA_DIR.glob("*.csv")):
    station = file.stem.replace("_", " ").title()
    current_month = None
    hour_headers = []

    try:
        with open(file, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)

            for row in reader:
                if not row:
                    continue

                first = row[0].strip().strip('"')

                if not first or first.lower() == "year":
                    continue

                month_match = re.fullmatch(
                    r"([A-Za-z]+)-(\d{4})", first
                )

                if month_match:
                    try:
                        current_month = pd.to_datetime(
                            first, format="%B-%Y"
                        )
                    except ValueError:
                        current_month = None

                    hour_headers = row[1:]
                    continue

                if current_month is None or not first.isdigit():
                    continue

                day = int(first)

                for hour_index, raw_value in enumerate(row[1:]):
                    if hour_index >= len(hour_headers):
                        break

                    hour_text = hour_headers[hour_index].strip()

                    try:
                        timestamp = pd.to_datetime(
                            f"{current_month.year}-"
                            f"{current_month.month:02d}-"
                            f"{day:02d} {hour_text}",
                            format="%Y-%m-%d %H:%M:%S"
                        )
                    except (ValueError, TypeError):
                        continue

                    value = raw_value.strip() if raw_value else ""

                    if value.lower() in {"", "na", "nan", "null", "none"}:
                        measurement = float("nan")
                    else:
                        try:
                            measurement = float(value)
                        except ValueError:
                            measurement = float("nan")

                    records.append({
                        "timestamp": timestamp,
                        "station": station,
                        "measurement": measurement
                    })

        files_processed += 1

    except (OSError, csv.Error) as error:
        files_skipped.append(f"{file.name}: {error}")

if not records:
    raise ValueError(
        "No records were extracted. Check the rawdata folder "
        "and the CSV file format."
    )

df = pd.DataFrame(records)

rows_before = len(df)
missing_before = int(df["measurement"].isna().sum())

# Remove duplicate station and timestamp records.
df = df.drop_duplicates(
    subset=["station", "timestamp"],
    keep="first"
)

# Treat negative measurements as invalid.
df.loc[df["measurement"] < 0, "measurement"] = float("nan")

# Remove records without usable measurements.
df = df.dropna(subset=["measurement"])

# Sort chronologically.
df = df.sort_values(
    ["timestamp", "station"]
).reset_index(drop=True)

df["measurement"] = df["measurement"].round(2)

# Rename the measurement column.
df = df.rename(columns={"measurement": "AQI"})

df.to_csv(OUTPUT_FILE, index=False)

summary = [
    "AirSense Data Preprocessing Summary\n",
    f"Files processed: {files_processed}",
    f"Files skipped: {len(files_skipped)}",
    f"Rows extracted before cleaning: {rows_before}",
    f"Missing measurements before cleaning: {missing_before}",
    f"Rows after cleaning: {len(df)}",
    f"Unique stations: {df['station'].nunique()}",
    f"First timestamp: {df['timestamp'].min()}",
    f"Last timestamp: {df['timestamp'].max()}",
    f"Remaining missing measurements: {df['AQI'].isna().sum()}",
    "",
    "Records per station:",
    df.groupby("station").size().to_string(),
    "",
    "Files skipped due to errors:",
    "\n".join(files_skipped) if files_skipped else "None",
]

Path(SUMMARY_FILE).write_text(
    "\n".join(summary), encoding="utf-8"
)

print("\n".join(summary))
print(f"\nSaved cleaned dataset to: {OUTPUT_FILE}")
