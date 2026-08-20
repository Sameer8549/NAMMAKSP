"""Evidence queries over the Police FIR ER model."""

from __future__ import annotations

import re

from database import fetch_all, fetch_one


def case_master_id(fir_id: str) -> int:
    match = re.fullmatch(r"FIR(\d{5})", fir_id.upper())
    if not match:
        raise ValueError("Invalid synthetic FIR identifier")
    return int(match.group(1))


async def get_er_case_evidence(fir_id: str) -> dict | None:
    """Return a compact, source-labelled ER evidence trail for one FIR."""
    case_id = case_master_id(fir_id)
    case = await fetch_one(
        """
        SELECT cm.CaseMasterID, cm.CrimeNo, cm.CaseNo,
               cm.CrimeRegisteredDate, cm.BriefFacts,
               cs.CaseStatusName, cc.LookupValue AS CaseCategory,
               gof.LookupValue AS Gravity,
               ch.CrimeGroupName, csh.CrimeHeadName AS CrimeSubHead,
               u.UnitName AS PoliceStation, d.DistrictName,
               e.FirstName AS RegisteringOfficer,
               occ.IncidentFromDate, occ.IncidentToDate,
               occ.InfoReceivedPSDate, occ.latitude, occ.longitude
        FROM CaseMaster cm
        JOIN CaseStatusMaster cs ON cs.CaseStatusID = cm.CaseStatusID
        JOIN CaseCategory cc ON cc.CaseCategoryID = cm.CaseCategoryID
        JOIN GravityOffence gof ON gof.GravityOffenceID = cm.GravityOffenceID
        JOIN CrimeHead ch ON ch.CrimeHeadID = cm.CrimeMajorHeadID
        JOIN CrimeSubHead csh ON csh.CrimeSubHeadID = cm.CrimeMinorHeadID
        JOIN Unit u ON u.UnitID = cm.PoliceStationID
        JOIN District d ON d.DistrictID = u.DistrictID
        JOIN Employee e ON e.EmployeeID = cm.PolicePersonID
        LEFT JOIN InvOccurrenceTime occ ON occ.CaseMasterID = cm.CaseMasterID
        WHERE cm.CaseMasterID = ?
        """,
        (case_id,),
    )
    if not case:
        return None

    accused = await fetch_all(
        """
        SELECT AccusedMasterID, AccusedName, AgeYear, GenderID,
               PersonID, SourceOffenderID
        FROM Accused WHERE CaseMasterID = ? ORDER BY AccusedMasterID
        """,
        (case_id,),
    )
    victims = await fetch_all(
        """
        SELECT VictimMasterID, VictimName, AgeYear, GenderID,
               VictimPolice, SourceVictimID
        FROM Victim WHERE CaseMasterID = ? ORDER BY VictimMasterID
        """,
        (case_id,),
    )
    legal = await fetch_all(
        """
        SELECT asa.ActID, asa.SectionID, a.ActDescription, s.SectionDescription
        FROM ActSectionAssociation asa
        JOIN Act a ON a.ActCode = asa.ActID
        JOIN "Section" s ON s.ActCode = asa.ActID AND s.SectionCode = asa.SectionID
        WHERE asa.CaseMasterID = ?
        ORDER BY asa.ActOrderID, asa.SectionOrderID
        """,
        (case_id,),
    )
    return {
        "source": "Police FIR ER model (synthetic demo)",
        "case_master": case,
        "accused": accused,
        "victims": victims,
        "legal_associations": legal,
    }


async def get_er_network_rows(district: str | None, crime_type: str | None, limit: int) -> list[dict]:
    """Build graph-ready case/person rows from normalized ER relationships."""
    conditions = []
    params: list = []
    if district:
        conditions.append("d.DistrictName = ?")
        params.append(district)
    if crime_type:
        conditions.append("csh.CrimeHeadName = ?")
        params.append(crime_type)
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    params.append(limit)
    return await fetch_all(
        f"""
        SELECT a.SourceOffenderID AS offender_id,
               v.SourceVictimID AS victim_id,
               'FIR' || printf('%05d', cm.CaseMasterID) AS fir_id,
               'accused_in_case' AS relationship_type,
               a.AccusedName AS offender_name,
               COALESCE(o.risk_category, 'Low') AS risk_category,
               COALESCE(o.previous_firs, 0) AS previous_firs,
               v.VictimName AS victim_name,
               csh.CrimeHeadName AS crime_type,
               cs.CaseStatusName AS status,
               cm.CrimeRegisteredDate AS date,
               d.DistrictName AS district
        FROM CaseMaster cm
        JOIN Accused a ON a.CaseMasterID = cm.CaseMasterID
        JOIN Victim v ON v.CaseMasterID = cm.CaseMasterID
        JOIN CrimeSubHead csh ON csh.CrimeSubHeadID = cm.CrimeMinorHeadID
        JOIN CaseStatusMaster cs ON cs.CaseStatusID = cm.CaseStatusID
        JOIN Unit u ON u.UnitID = cm.PoliceStationID
        JOIN District d ON d.DistrictID = u.DistrictID
        LEFT JOIN offenders o ON o.offender_id = a.SourceOffenderID
        {where}
        ORDER BY cm.CaseMasterID
        LIMIT ?
        """,
        tuple(params),
    )
