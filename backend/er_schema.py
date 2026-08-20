"""Police FIR ER schema used by NAMMA KSP.

The table and column names follow the supplied Police FIR ER specification.
Two documented compatibility fields remain in parent records, while normalized
child/junction tables are authoritative for occurrence and arrest relationships.
"""

ER_SCHEMA_VERSION = "2026.08-round2"

ER_TABLES = (
    "State", "District", "UnitType", "Unit", "Rank", "Designation",
    "Employee", "Court", "CaseCategory", "GravityOffence",
    "CaseStatusMaster", "OccupationMaster", "ReligionMaster", "CasteMaster",
    "CrimeHead", "CrimeSubHead", "Act", "Section", "CrimeHeadActSection",
    "CaseMaster", "InvOccurrenceTime", "ComplainantDetails", "Victim",
    "Accused", "ArrestSurrender", "InvArrestSurrenderAccused",
    "ActSectionAssociation", "ChargesheetDetails",
)


ER_CREATE_TABLES_SQL = r"""
CREATE TABLE IF NOT EXISTS State (
    StateID INTEGER PRIMARY KEY,
    StateName TEXT NOT NULL,
    NationalityID INTEGER,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS District (
    DistrictID INTEGER PRIMARY KEY,
    DistrictName TEXT NOT NULL,
    StateID INTEGER NOT NULL,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1)),
    FOREIGN KEY (StateID) REFERENCES State(StateID)
);

CREATE TABLE IF NOT EXISTS UnitType (
    UnitTypeID INTEGER PRIMARY KEY,
    UnitTypeName TEXT NOT NULL,
    CityDistState TEXT,
    Hierarchy INTEGER,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS Unit (
    UnitID INTEGER PRIMARY KEY,
    UnitName TEXT NOT NULL,
    TypeID INTEGER NOT NULL,
    ParentUnit INTEGER,
    NationalityID INTEGER,
    StateID INTEGER NOT NULL,
    DistrictID INTEGER NOT NULL,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1)),
    FOREIGN KEY (TypeID) REFERENCES UnitType(UnitTypeID),
    FOREIGN KEY (ParentUnit) REFERENCES Unit(UnitID),
    FOREIGN KEY (StateID) REFERENCES State(StateID),
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID)
);

CREATE TABLE IF NOT EXISTS Rank (
    RankID INTEGER PRIMARY KEY,
    RankName TEXT NOT NULL,
    Hierarchy INTEGER,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS Designation (
    DesignationID INTEGER PRIMARY KEY,
    DesignationName TEXT NOT NULL,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1)),
    SortOrder INTEGER
);

CREATE TABLE IF NOT EXISTS Employee (
    EmployeeID INTEGER PRIMARY KEY,
    DistrictID INTEGER NOT NULL,
    UnitID INTEGER NOT NULL,
    RankID INTEGER NOT NULL,
    DesignationID INTEGER NOT NULL,
    KGID TEXT UNIQUE,
    FirstName TEXT NOT NULL,
    EmployeeDOB TEXT,
    GenderID INTEGER,
    BloodGroupID INTEGER,
    PhysicallyChallenged INTEGER DEFAULT 0 CHECK (PhysicallyChallenged IN (0, 1)),
    AppointmentDate TEXT,
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (UnitID) REFERENCES Unit(UnitID),
    FOREIGN KEY (RankID) REFERENCES Rank(RankID),
    FOREIGN KEY (DesignationID) REFERENCES Designation(DesignationID)
);

CREATE TABLE IF NOT EXISTS Court (
    CourtID INTEGER PRIMARY KEY,
    CourtName TEXT NOT NULL,
    DistrictID INTEGER NOT NULL,
    StateID INTEGER NOT NULL,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1)),
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (StateID) REFERENCES State(StateID)
);

CREATE TABLE IF NOT EXISTS CaseCategory (
    CaseCategoryID INTEGER PRIMARY KEY,
    LookupValue TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS GravityOffence (
    GravityOffenceID INTEGER PRIMARY KEY,
    LookupValue TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS CaseStatusMaster (
    CaseStatusID INTEGER PRIMARY KEY,
    CaseStatusName TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS OccupationMaster (
    OccupationID INTEGER PRIMARY KEY,
    OccupationName TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ReligionMaster (
    ReligionID INTEGER PRIMARY KEY,
    ReligionName TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS CasteMaster (
    caste_master_id INTEGER PRIMARY KEY,
    caste_master_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS CrimeHead (
    CrimeHeadID INTEGER PRIMARY KEY,
    CrimeGroupName TEXT NOT NULL,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS CrimeSubHead (
    CrimeSubHeadID INTEGER PRIMARY KEY,
    CrimeHeadID INTEGER NOT NULL,
    CrimeHeadName TEXT NOT NULL,
    SeqID INTEGER,
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID)
);

CREATE TABLE IF NOT EXISTS Act (
    ActCode TEXT PRIMARY KEY,
    ActDescription TEXT NOT NULL,
    ShortName TEXT,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS "Section" (
    ActCode TEXT NOT NULL,
    SectionCode TEXT NOT NULL,
    SectionDescription TEXT,
    Active INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1)),
    PRIMARY KEY (ActCode, SectionCode),
    FOREIGN KEY (ActCode) REFERENCES Act(ActCode)
);

CREATE TABLE IF NOT EXISTS CrimeHeadActSection (
    CrimeHeadID INTEGER NOT NULL,
    ActCode TEXT NOT NULL,
    SectionCode TEXT NOT NULL,
    PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (ActCode, SectionCode) REFERENCES "Section"(ActCode, SectionCode)
);

CREATE TABLE IF NOT EXISTS CaseMaster (
    CaseMasterID INTEGER PRIMARY KEY,
    CrimeNo TEXT NOT NULL UNIQUE,
    CaseNo TEXT NOT NULL,
    CrimeRegisteredDate TEXT NOT NULL,
    PolicePersonID INTEGER NOT NULL,
    PoliceStationID INTEGER NOT NULL,
    CaseCategoryID INTEGER NOT NULL,
    GravityOffenceID INTEGER NOT NULL,
    CrimeMajorHeadID INTEGER NOT NULL,
    CrimeMinorHeadID INTEGER NOT NULL,
    CaseStatusID INTEGER NOT NULL,
    CourtID INTEGER,
    IncidentFromDate TEXT,
    IncidentToDate TEXT,
    InfoReceivedPSDate TEXT,
    latitude REAL,
    longitude REAL,
    BriefFacts TEXT,
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID),
    FOREIGN KEY (GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID),
    FOREIGN KEY (CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID),
    FOREIGN KEY (CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID)
);

-- Authoritative one-to-one incident occurrence record. CaseMaster incident
-- columns are retained to match the table definition and legacy exports.
CREATE TABLE IF NOT EXISTS InvOccurrenceTime (
    CaseMasterID INTEGER PRIMARY KEY,
    IncidentFromDate TEXT,
    IncidentToDate TEXT,
    InfoReceivedPSDate TEXT,
    latitude REAL,
    longitude REAL,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ComplainantDetails (
    ComplainantID INTEGER PRIMARY KEY,
    CaseMasterID INTEGER NOT NULL,
    ComplainantName TEXT NOT NULL,
    AgeYear INTEGER,
    OccupationID INTEGER,
    ReligionID INTEGER,
    CasteID INTEGER,
    GenderID INTEGER,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE,
    FOREIGN KEY (OccupationID) REFERENCES OccupationMaster(OccupationID),
    FOREIGN KEY (ReligionID) REFERENCES ReligionMaster(ReligionID),
    FOREIGN KEY (CasteID) REFERENCES CasteMaster(caste_master_id)
);

CREATE TABLE IF NOT EXISTS Victim (
    VictimMasterID INTEGER PRIMARY KEY,
    CaseMasterID INTEGER NOT NULL,
    VictimName TEXT NOT NULL,
    AgeYear INTEGER,
    GenderID INTEGER,
    VictimPolice TEXT DEFAULT '0',
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Accused (
    AccusedMasterID INTEGER PRIMARY KEY,
    CaseMasterID INTEGER NOT NULL,
    AccusedName TEXT NOT NULL,
    AgeYear INTEGER,
    GenderID INTEGER,
    PersonID TEXT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ArrestSurrender (
    ArrestSurrenderID INTEGER PRIMARY KEY,
    CaseMasterID INTEGER NOT NULL,
    ArrestSurrenderTypeID INTEGER NOT NULL,
    ArrestSurrenderDate TEXT,
    ArrestSurrenderStateId INTEGER,
    ArrestSurrenderDistrictId INTEGER,
    PoliceStationID INTEGER,
    IOID INTEGER,
    CourtID INTEGER,
    AccusedMasterID INTEGER,
    IsAccused INTEGER DEFAULT 1 CHECK (IsAccused IN (0, 1)),
    IsComplainantAccused INTEGER DEFAULT 0 CHECK (IsComplainantAccused IN (0, 1)),
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE,
    FOREIGN KEY (ArrestSurrenderStateId) REFERENCES State(StateID),
    FOREIGN KEY (ArrestSurrenderDistrictId) REFERENCES District(DistrictID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (IOID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID),
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

-- Authoritative many-to-many link for arrest events involving multiple accused.
CREATE TABLE IF NOT EXISTS InvArrestSurrenderAccused (
    ArrestSurrenderID INTEGER NOT NULL,
    AccusedMasterID INTEGER NOT NULL,
    PRIMARY KEY (ArrestSurrenderID, AccusedMasterID),
    FOREIGN KEY (ArrestSurrenderID) REFERENCES ArrestSurrender(ArrestSurrenderID) ON DELETE CASCADE,
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ActSectionAssociation (
    CaseMasterID INTEGER NOT NULL,
    ActID TEXT NOT NULL,
    SectionID TEXT NOT NULL,
    ActOrderID INTEGER,
    SectionOrderID INTEGER,
    PRIMARY KEY (CaseMasterID, ActID, SectionID),
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE,
    FOREIGN KEY (ActID, SectionID) REFERENCES "Section"(ActCode, SectionCode)
);

CREATE TABLE IF NOT EXISTS ChargesheetDetails (
    CSID INTEGER PRIMARY KEY,
    CaseMasterID INTEGER NOT NULL,
    csdate TEXT,
    cstype TEXT CHECK (cstype IN ('A', 'B', 'C')),
    PolicePersonID INTEGER,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID) ON DELETE CASCADE,
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_number_station
    ON CaseMaster(PoliceStationID, CaseCategoryID, CaseNo);
CREATE INDEX IF NOT EXISTS idx_case_registered_date ON CaseMaster(CrimeRegisteredDate);
CREATE INDEX IF NOT EXISTS idx_case_status ON CaseMaster(CaseStatusID);
CREATE INDEX IF NOT EXISTS idx_case_crime_heads ON CaseMaster(CrimeMajorHeadID, CrimeMinorHeadID);
CREATE INDEX IF NOT EXISTS idx_victim_case ON Victim(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_accused_case ON Accused(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_arrest_case ON ArrestSurrender(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_complainant_case ON ComplainantDetails(CaseMasterID);
"""


async def validate_er_schema(db) -> dict:
    """Validate required tables, foreign keys, and normalized cardinality."""
    async with db.execute("SELECT name FROM sqlite_master WHERE type='table'") as cursor:
        existing = {row[0] for row in await cursor.fetchall()}
    missing = sorted(set(ER_TABLES) - existing)

    async with db.execute("PRAGMA foreign_key_check") as cursor:
        foreign_key_errors = [tuple(row) for row in await cursor.fetchall()]

    async with db.execute(
        """
        SELECT CaseMasterID, COUNT(*) AS occurrence_count
        FROM InvOccurrenceTime
        GROUP BY CaseMasterID
        HAVING COUNT(*) > 1
        """
    ) as cursor:
        occurrence_errors = [tuple(row) for row in await cursor.fetchall()]

    return {
        "schema_version": ER_SCHEMA_VERSION,
        "valid": not missing and not foreign_key_errors and not occurrence_errors,
        "missing_tables": missing,
        "foreign_key_errors": foreign_key_errors,
        "occurrence_cardinality_errors": occurrence_errors,
    }
