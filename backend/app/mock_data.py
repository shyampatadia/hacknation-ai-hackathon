from app.models import DistrictRecord, FacilityRecord


MOCK_FACILITIES = [
    FacilityRecord(
        id="rnc-001",
        name="St. Mira Women and Critical Care Centre",
        type="Multispecialty hospital",
        city="Ranchi",
        state="Jharkhand",
        distance_km=18,
        trust_score=84,
        specialties=["Maternal", "ICU", "Surgery"],
        evidence="Facility text references OT support, anesthetist coverage, emergency C-section capability, and 24/7 obstetric staff on call.",
        flags=[],
    ),
    FacilityRecord(
        id="rnc-002",
        name="Sadar Cardio and Trauma Institute",
        type="Specialty hospital",
        city="Ranchi",
        state="Jharkhand",
        distance_km=31,
        trust_score=76,
        specialties=["Cardiac", "Trauma", "ICU"],
        evidence="Website and structured fields both reference cath lab support, ventilators, trauma intake, and a staffed emergency desk.",
        flags=["Limited neonatal detail"],
    ),
    FacilityRecord(
        id="plt-003",
        name="Palamu District Referral Hospital",
        type="District hospital",
        city="Medininagar",
        state="Jharkhand",
        distance_km=68,
        trust_score=58,
        specialties=["Maternal", "Emergency"],
        evidence="Core emergency services are present, but specialty evidence is thinner and recent web verification is incomplete.",
        flags=["Sparse website evidence", "Low staff detail"],
    ),
    FacilityRecord(
        id="pat-004",
        name="Patna Advanced Heart and Renal Centre",
        type="Specialty hospital",
        city="Patna",
        state="Bihar",
        distance_km=12,
        trust_score=89,
        specialties=["Cardiac", "Dialysis", "ICU"],
        evidence="Full-text record and web cross-check confirm dialysis units, cardiac ICU beds, and consultant listings across departments.",
        flags=[],
    ),
]

MOCK_DISTRICTS = [
    DistrictRecord(
        name="Palamu, Jharkhand",
        summary="No verified cardiac facility inside the local district radius. Highest urgency for referral routing.",
        desert_score=93,
        status="critical",
    ),
    DistrictRecord(
        name="Gaya, Bihar",
        summary="Moderate maternal coverage, but neonatal support remains thin outside the city core.",
        desert_score=64,
        status="moderate",
    ),
    DistrictRecord(
        name="Mysuru, Karnataka",
        summary="Cardiac and trauma coverage are stronger. District operates as a comparison baseline.",
        desert_score=22,
        status="covered",
    ),
]
