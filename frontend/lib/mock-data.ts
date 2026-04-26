export type Facility = {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  distanceKm: number;
  trustScore: number;
  specialties: string[];
  evidence: string;
  flags: string[];
};

export type DistrictSnapshot = {
  name: string;
  summary: string;
  desertScore: number;
  status: "covered" | "moderate" | "critical";
  specialties?: string[];
};

export const quickFilters = ["ICU", "Dialysis", "Neonatal", "Cardiac", "Trauma", "Maternal"];

export const mockFacilities: Facility[] = [
  {
    id: "rnc-001",
    name: "St. Mira Women and Critical Care Centre",
    type: "Multispecialty hospital",
    city: "Ranchi",
    state: "Jharkhand",
    distanceKm: 18,
    trustScore: 84,
    specialties: ["Maternal", "ICU", "Surgery"],
    evidence:
      "Facility text references OT support, anesthetist coverage, emergency C-section capability, and 24/7 obstetric staff on call.",
    flags: [],
  },
  {
    id: "rnc-002",
    name: "Sadar Cardio and Trauma Institute",
    type: "Specialty hospital",
    city: "Ranchi",
    state: "Jharkhand",
    distanceKm: 31,
    trustScore: 76,
    specialties: ["Cardiac", "Trauma", "ICU"],
    evidence:
      "Website and structured fields both reference cath lab support, ventilators, trauma intake, and a staffed emergency desk.",
    flags: ["Limited neonatal detail"],
  },
  {
    id: "plt-003",
    name: "Palamu District Referral Hospital",
    type: "District hospital",
    city: "Medininagar",
    state: "Jharkhand",
    distanceKm: 68,
    trustScore: 58,
    specialties: ["Maternal", "Emergency"],
    evidence:
      "Core emergency services are present, but specialty evidence is thinner and recent web verification is incomplete.",
    flags: ["Sparse website evidence", "Low staff detail"],
  },
  {
    id: "pat-004",
    name: "Patna Advanced Heart and Renal Centre",
    type: "Specialty hospital",
    city: "Patna",
    state: "Bihar",
    distanceKm: 12,
    trustScore: 89,
    specialties: ["Cardiac", "Dialysis", "ICU"],
    evidence:
      "Full-text record and web cross-check confirm dialysis units, cardiac ICU beds, and consultant listings across departments.",
    flags: [],
  },
];

export const districtSnapshots: DistrictSnapshot[] = [
  {
    name: "Palamu, Jharkhand",
    summary: "No verified cardiac facility inside the local district radius. Highest urgency for referral routing.",
    desertScore: 93,
    status: "critical",
  },
  {
    name: "Gaya, Bihar",
    summary: "Moderate maternal coverage, but neonatal support remains thin outside the city core.",
    desertScore: 64,
    status: "moderate",
  },
  {
    name: "Mysuru, Karnataka",
    summary: "Cardiac and trauma coverage are stronger. District operates as a comparison baseline.",
    desertScore: 22,
    status: "covered",
  },
];

