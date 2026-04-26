"use client";

import { useEffect, useMemo, useState } from "react";
import { TrustBadge } from "@/components/TrustBadge";
import { apiRoutes } from "@/lib/api";
import { Facility, mockFacilities } from "@/lib/mock-data";

const STATE_OPTIONS = [
  { value: "all", label: "All states" },
  { value: "jharkhand", label: "Jharkhand" },
  { value: "bihar", label: "Bihar" },
  { value: "karnataka", label: "Karnataka" },
];

const SPECIALTY_OPTIONS = [
  { value: "all", label: "All specialties" },
  { value: "cardiac", label: "Cardiac" },
  { value: "maternal", label: "Maternal" },
  { value: "trauma", label: "Trauma" },
];

const TRUST_OPTIONS = [
  { value: "50", label: "Trust 50+" },
  { value: "60", label: "Trust 60+" },
  { value: "75", label: "Trust 75+" },
];

export default function BrowsePage() {
  const [facilities, setFacilities] = useState<Facility[]>(mockFacilities);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>(mockFacilities);
  const [stateFilter, setStateFilter] = useState("jharkhand");
  const [specialtyFilter, setSpecialtyFilter] = useState("maternal");
  const [trustFilter, setTrustFilter] = useState("60");

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await fetch(apiRoutes.facilities);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const payload = Array.isArray(data) ? data : data.facilities ?? data.items ?? [];
        setFacilities(payload);
      } catch (error) {
        console.error("Error fetching facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  useEffect(() => {
    const stateValue = stateFilter.toLowerCase();
    const specialtyValue = specialtyFilter.toLowerCase();
    const trustValue = Number(trustFilter);

    setFilteredFacilities(
      facilities.filter((facility) => {
        const matchesState =
          stateValue === "all" || facility.state.toLowerCase() === stateValue;
        const matchesSpecialty =
          specialtyValue === "all" ||
          facility.specialties.some((specialty) => specialty.toLowerCase() === specialtyValue);
          console.log("Scores:", facility.trustScore, trustValue);
        // const matchesTrust = Number(facility.trustScore) >= trustValue; // DEBUG 
        // const matchesTrust = facility.trustScore == trustValue; // Exact match for debugging
        return matchesState && matchesSpecialty;// && matchesTrust;
      })
    );

    // filterFacilities();
    // const stateValue = stateFilter.toLowerCase();
    // const specialtyValue = specialtyFilter.toLowerCase();
    // const trustValue = Number(trustFilter);

    // setFilteredFacilities(
    //   facilities.filter((facility) => {
    //     const matchesState =
    //       stateValue === "all" || facility.state.toLowerCase() === stateValue;
    //     const matchesSpecialty =
    //       specialtyValue === "all" ||
    //       facility.specialties.some((specialty) => specialty.toLowerCase() === specialtyValue);
    //     const matchesTrust = facility.trustScore >= trustValue;
    //     return matchesState && matchesSpecialty && matchesTrust;
    //   })
    // );
  }, [facilities, stateFilter, specialtyFilter, trustFilter]);

  const flaggedCount = useMemo(
    () => filteredFacilities.filter((facility) => facility.flags.length > 0).length,
    [filteredFacilities]
  );

  return (
    <section className="browser-shell">
      <div className="browser-header">
        <div>
          <span className="eyebrow">Facility audit</span>
          <h1>Inspect trust, evidence, and contradictions at record level.</h1>
          <p>
            This view should feel like an operations table, not a brochure. Sort, filter, and interrogate
            facility claims quickly.
          </p>
        </div>
        <div className="browser-summary">
          <strong>{flaggedCount}</strong>
          <span>Flagged facilities in current view</span>
        </div>
      </div>

      <div className="filters">
        <select
          className="filter-state"
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
        >
          {STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="filter-specialty"
          value={specialtyFilter}
          onChange={(event) => setSpecialtyFilter(event.target.value)}
        >
          {SPECIALTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="filter-trust"
          value={trustFilter}
          onChange={(event) => setTrustFilter(event.target.value)}
        >
          {TRUST_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <table className="facility-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Specialties</th>
            <th>Trust</th>
            <th>Flags</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {filteredFacilities.map((facility) => (
            <tr key={facility.id}>
              <td>
                <strong>{facility.name}</strong>
                <p className="muted">{facility.type}</p>
              </td>
              <td>
                {facility.city}, {facility.state}
              </td>
              <td>{facility.specialties.join(", ")}</td>
              <td>
                <TrustBadge score={facility.trustScore} />
              </td>
              <td>{facility.flags.length ? facility.flags.join(", ") : "None"}</td>
              <td>{facility.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
