"use client";

import { useEffect, useMemo, useState } from "react";

import type { DistrictSnapshot } from "@/lib/mock-data";
import { apiRoutes } from "@/lib/api";
import { normalizeDistrict } from "@/lib/normalize";

type DesertMapProps = {
  districts?: DistrictSnapshot[];
};

type MapRegion = {
  key: string;
  label: string;
  path: string;
};

const CATEGORIES = ["Cardiac", "Dialysis", "Neonatal", "Trauma", "Maternal"];

const MAP_REGIONS: MapRegion[] = [
  { key: "Rajasthan", label: "Rajasthan", path: "M132 122 L158 88 L205 92 L224 130 L196 178 L149 172 Z" },
  { key: "Uttar Pradesh", label: "Uttar Pradesh", path: "M212 120 L288 110 L332 126 L320 158 L252 166 L210 148 Z" },
  { key: "Bihar", label: "Bihar", path: "M330 126 L378 124 L404 138 L392 158 L344 160 L320 148 Z" },
  { key: "Jharkhand", label: "Jharkhand", path: "M320 162 L360 160 L378 182 L340 202 L312 188 Z" },
  { key: "West Bengal", label: "West Bengal", path: "M404 138 L430 146 L440 182 L414 214 L396 192 L392 158 Z" },
  { key: "Chhattisgarh", label: "Chhattisgarh", path: "M268 176 L316 176 L334 212 L306 260 L258 236 Z" },
  { key: "Maharashtra", label: "Maharashtra", path: "M176 236 L258 220 L304 246 L278 298 L214 302 L170 270 Z" },
  { key: "Odisha", label: "Odisha", path: "M336 206 L374 202 L394 226 L376 266 L338 252 Z" },
  { key: "Karnataka", label: "Karnataka", path: "M202 320 L256 306 L272 360 L238 424 L194 402 L186 352 Z" },
  { key: "Tamil Nadu", label: "Tamil Nadu", path: "M248 426 L288 404 L304 454 L268 492 L236 470 Z" },
];

function getCoverageTone(score: number) {
  if (score >= 80) return "critical";
  if (score >= 50) return "moderate";
  return "covered";
}

export function DesertMap({ districts: initialDistricts }: DesertMapProps) {
  const [districts, setDistricts] = useState<DistrictSnapshot[]>(initialDistricts ?? []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeserts = async () => {
      try {
        const response = await fetch(apiRoutes.mapDeserts);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const nextDistricts = data.districts ?? [];
        if (Array.isArray(nextDistricts) && nextDistricts.length > 0) {
          setDistricts(nextDistricts.map(normalizeDistrict));
        }
      } catch (error) {
        console.error("Error fetching desert data:", error);
      }
    };

    fetchDeserts();
  }, []);

  const filteredDistricts = useMemo(() => {
    if (!activeCategory) return districts;
    const categoryLower = activeCategory.toLowerCase();
    return districts.filter(
      (district) =>
        district.specialties?.some((specialty) => specialty.toLowerCase().includes(categoryLower)) ||
        district.summary.toLowerCase().includes(categoryLower)
    );
  }, [activeCategory, districts]);

  const districtsByState = useMemo(() => {
    return filteredDistricts.reduce<Record<string, DistrictSnapshot[]>>((acc, district) => {
      acc[district.state] = acc[district.state] ?? [];
      acc[district.state].push(district);
      return acc;
    }, {});
  }, [filteredDistricts]);

  const selectedDistricts = selectedState ? districtsByState[selectedState] ?? [] : [];

  const relevantStates = useMemo(() => new Set(Object.keys(districtsByState)), [districtsByState]);

  useEffect(() => {
    if (selectedState && !districtsByState[selectedState]?.length) {
      setSelectedState(null);
    }
  }, [districtsByState, selectedState]);

  return (
    <section className="panel map-board">
      <div className="map-toolbar">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              className="chip"
              data-active={isActive}
              onClick={() => setActiveCategory(isActive ? null : category)}
            >
              {category}
            </button>
          );
        })}
      </div>
      <div className="map-workspace">
        <div className="map-visual-column">
          <div className="map-canvas map-canvas-choropleth">
            <svg
              className="india-map"
              viewBox="120 72 340 440"
              role="img"
              aria-label="India healthcare desert map"
            >
              {MAP_REGIONS.map((region) => {
                const stateDistricts = districtsByState[region.key] ?? [];
                const tone = stateDistricts.length
                  ? getCoverageTone(Math.max(...stateDistricts.map((district) => district.desertScore)))
                  : "muted";

                return (
                  <path
                    key={region.key}
                    d={region.path}
                    className="map-region"
                    data-tone={tone}
                    data-active={selectedState === region.key}
                    aria-label={region.label}
                    role="button"
                    tabIndex={stateDistricts.length ? 0 : -1}
                    onClick={() => {
                      if (!stateDistricts.length) return;
                      setSelectedState(region.key);
                    }}
                    onKeyDown={(event) => {
                      if (!stateDistricts.length) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedState(region.key);
                      }
                    }}
                  />
                );
              })}
            </svg>
          </div>

          <div className="map-legend">
            <span className="map-legend-item"><i data-tone="critical" />Critical gap</span>
            <span className="map-legend-item"><i data-tone="moderate" />Moderate gap</span>
            <span className="map-legend-item"><i data-tone="covered" />Better coverage</span>
            <span className="map-legend-item"><i data-tone="muted" />No active data</span>
          </div>
        </div>

        <div className="map-detail-column">
          <div className="map-selection-header">
            <div>
              <span className="eyebrow">Selected state</span>
              <h3>{selectedState ?? "Click a colored state to inspect its districts"}</h3>
            </div>
            {selectedState ? (
              <button type="button" className="secondary-button" onClick={() => setSelectedState(null)}>
                Clear selection
              </button>
            ) : null}
          </div>

          <div className="map-selection-grid">
            {selectedDistricts.length > 0 ? (
              selectedDistricts.map((district) => (
                <article key={district.name} className="map-detail-card">
                  <strong>{district.name}</strong>
                  <p>{district.summary}</p>
                  <span>Desert score {district.desertScore}</span>
                </article>
              ))
            ) : (
              <div className="map-empty-state">
                {relevantStates.size > 0
                  ? "Colored states contain the active coverage signals. Grey states are outside the current dataset or filter."
                  : "No states match the active filter."}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
