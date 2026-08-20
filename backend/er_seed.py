"""Deterministic synthetic-data migration into the Police FIR ER model."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import pandas as pd


STATE_ID = 29

CRIME_GROUPS = {
    "Assault": "Crimes Against Persons",
    "Domestic Violence": "Crimes Against Persons",
    "Kidnapping": "Crimes Against Persons",
    "Murder": "Crimes Against Persons",
    "Burglary": "Property Crime",
    "Robbery": "Property Crime",
    "Theft": "Property Crime",
    "Vehicle Theft": "Property Crime",
    "Cyber Crime": "Economic and Cyber Crime",
    "Financial Fraud": "Economic and Cyber Crime",
    "Fraud": "Economic and Cyber Crime",
    "Drug Offense": "Narcotics Crime",
}

HEINOUS_CRIMES = {"Murder", "Kidnapping", "Robbery", "Drug Offense"}
GENDER_IDS = {"Male": 1, "Female": 2, "Transgender": 3}


def _number(value: str) -> int:
    digits = "".join(character for character in str(value) if character.isdigit())
    return int(digits or 0)


def _frame(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    frame.columns = [column.lower() for column in frame.columns]
    return frame


async def seed_er_model(db, data_dir: Path) -> dict:
    """Seed the ER model once from the repository's disclosed synthetic CSVs."""
    async with db.execute("SELECT COUNT(*) FROM CaseMaster") as cursor:
        existing = (await cursor.fetchone())[0]
    if existing:
        return {"seeded": False, "cases": existing}

    firs = _frame(data_dir / "firs.csv")
    locations = _frame(data_dir / "locations.csv")
    offenders = _frame(data_dir / "offenders.csv").set_index("offender_id")
    victims = _frame(data_dir / "victims.csv").set_index("victim_id")

    districts = sorted(set(firs["district"]) | set(locations["district"]))
    district_ids = {name: index + 1 for index, name in enumerate(districts)}
    station_pairs = sorted(set(zip(firs["district"], firs["police_station"])))
    unit_ids = {pair: index + 1 for index, pair in enumerate(station_pairs)}

    crime_types = sorted(firs["crime_type"].unique())
    group_names = sorted({CRIME_GROUPS.get(crime, "Other Crime") for crime in crime_types})
    group_ids = {name: index + 1 for index, name in enumerate(group_names)}
    subhead_ids = {name: index + 1 for index, name in enumerate(crime_types)}
    status_names = sorted(firs["status"].unique())
    status_ids = {name: index + 1 for index, name in enumerate(status_names)}

    await db.execute("INSERT INTO State VALUES (?,?,?,?)", (STATE_ID, "Karnataka", 1, 1))
    await db.executemany(
        "INSERT INTO District VALUES (?,?,?,?)",
        [(district_ids[name], name, STATE_ID, 1) for name in districts],
    )
    await db.execute("INSERT INTO UnitType VALUES (?,?,?,?,?)", (1, "Police Station", "District", 1, 1))
    await db.executemany(
        "INSERT INTO Unit VALUES (?,?,?,?,?,?,?,?)",
        [
            (unit_id, station, 1, None, 1, STATE_ID, district_ids[district], 1)
            for (district, station), unit_id in unit_ids.items()
        ],
    )
    await db.execute("INSERT INTO Rank VALUES (?,?,?,?)", (1, "Police Inspector", 1, 1))
    await db.execute("INSERT INTO Designation VALUES (?,?,?,?)", (1, "Investigating Officer", 1, 1))
    await db.executemany(
        "INSERT INTO Employee VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            (
                unit_id, district_ids[district], unit_id, 1, 1,
                f"SYNTH-KGID-{unit_id:04d}", f"Synthetic Officer {unit_id}",
                None, None, None, 0, None,
            )
            for (district, _station), unit_id in unit_ids.items()
        ],
    )
    await db.executemany(
        "INSERT INTO Court VALUES (?,?,?,?,?)",
        [(district_ids[name], f"Synthetic District Court - {name}", district_ids[name], STATE_ID, 1) for name in districts],
    )
    await db.execute("INSERT INTO CaseCategory VALUES (?,?)", (1, "FIR"))
    await db.executemany("INSERT INTO GravityOffence VALUES (?,?)", [(1, "Heinous"), (2, "Non-Heinous")])
    await db.executemany(
        "INSERT INTO CaseStatusMaster VALUES (?,?)",
        [(status_ids[name], name) for name in status_names],
    )
    await db.execute("INSERT INTO OccupationMaster VALUES (?,?)", (1, "Not supplied in synthetic dataset"))
    await db.execute("INSERT INTO ReligionMaster VALUES (?,?)", (1, "Not supplied in synthetic dataset"))
    await db.execute("INSERT INTO CasteMaster VALUES (?,?)", (1, "Not supplied in synthetic dataset"))
    await db.executemany(
        "INSERT INTO CrimeHead VALUES (?,?,?)",
        [(group_ids[name], name, 1) for name in group_names],
    )
    await db.executemany(
        "INSERT INTO CrimeSubHead VALUES (?,?,?,?)",
        [
            (subhead_ids[crime], group_ids[CRIME_GROUPS.get(crime, "Other Crime")], crime, index + 1)
            for index, crime in enumerate(crime_types)
        ],
    )
    await db.execute(
        "INSERT INTO Act VALUES (?,?,?,?)",
        ("DEMO", "Legal act not supplied in synthetic source dataset", "Synthetic unspecified", 1),
    )
    await db.execute(
        'INSERT INTO "Section" VALUES (?,?,?,?)',
        ("DEMO", "UNSPECIFIED", "Legal section not supplied in synthetic source dataset", 1),
    )
    await db.executemany(
        "INSERT INTO CrimeHeadActSection VALUES (?,?,?)",
        [(group_id, "DEMO", "UNSPECIFIED") for group_id in group_ids.values()],
    )

    location_lookup = locations.set_index("location_id")[["latitude", "longitude"]].to_dict("index")
    station_serials = defaultdict(int)
    case_rows = []
    occurrence_rows = []
    accused_rows = []
    victim_rows = []
    act_rows = []

    for row in firs.itertuples(index=False):
        case_id = _number(row.fir_id)
        year = int(str(row.date)[:4])
        unit_id = unit_ids[(row.district, row.police_station)]
        station_serials[(unit_id, year)] += 1
        serial = station_serials[(unit_id, year)]
        crime_no = f"1{district_ids[row.district]:04d}{unit_id:04d}{year:04d}{serial:05d}"
        case_no = f"{year:04d}{serial:05d}"
        location = location_lookup.get(row.location_id, {})
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        gravity_id = 1 if row.crime_type in HEINOUS_CRIMES else 2

        case_rows.append((
            case_id, crime_no, case_no, row.date, unit_id, unit_id, 1,
            gravity_id, group_ids[CRIME_GROUPS.get(row.crime_type, "Other Crime")],
            subhead_ids[row.crime_type], status_ids[row.status], district_ids[row.district],
            row.date, row.date, row.date, latitude, longitude,
            f"Synthetic {row.crime_type} case imported from {row.fir_id}.",
        ))
        occurrence_rows.append((case_id, row.date, row.date, row.date, latitude, longitude))

        offender = offenders.loc[row.offender_id]
        accused_rows.append((
            case_id, case_id, offender["name"], int(offender["age"]),
            GENDER_IDS.get(str(offender["gender"]), 0), "A1", row.offender_id,
        ))
        victim = victims.loc[row.victim_id]
        victim_rows.append((
            case_id, case_id, victim["name"], int(victim["age"]),
            GENDER_IDS.get(str(victim["gender"]), 0), "0", row.victim_id,
        ))
        act_rows.append((case_id, "DEMO", "UNSPECIFIED", 1, 1))

    await db.executemany(
        "INSERT INTO CaseMaster VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        case_rows,
    )
    await db.executemany("INSERT INTO InvOccurrenceTime VALUES (?,?,?,?,?,?)", occurrence_rows)
    await db.executemany("INSERT INTO Accused VALUES (?,?,?,?,?,?,?)", accused_rows)
    await db.executemany("INSERT INTO Victim VALUES (?,?,?,?,?,?,?)", victim_rows)
    await db.executemany("INSERT INTO ActSectionAssociation VALUES (?,?,?,?,?)", act_rows)
    await db.commit()

    return {
        "seeded": True,
        "cases": len(case_rows),
        "accused_case_links": len(accused_rows),
        "victim_case_links": len(victim_rows),
        "districts": len(districts),
        "units": len(unit_ids),
    }
