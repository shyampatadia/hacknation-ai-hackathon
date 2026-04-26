"use client";

import { useEffect, useState } from "react";
import type { DistrictSnapshot } from "@/lib/mock-data";
import { apiRoutes } from "@/lib/api";

type DesertMapProps = {
  districts?: DistrictSnapshot[];
};

const CATEGORIES = ["Cardiac", "Dialysis", "Neonatal", "Trauma"];

export function DesertMap({ districts: initialDistricts }: DesertMapProps) {
  const [districts, setDistricts] = useState<DistrictSnapshot[]>(initialDistricts ?? []);
  const [shownDistricts, setShownDistricts] = useState<DistrictSnapshot[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeserts = async () => {
      try {
        const response = await fetch(apiRoutes.mapDeserts);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDistricts(data.districts ?? []);
      } catch (error) {
        console.error("Error fetching desert data:", error);
      }
    };

    fetchDeserts();
  }, []);

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    // Filter districts by the selected category (case-insensitive)
    const categoryLower = category.toLowerCase();
    const filtered = districts.filter((district) =>
      district.specialties?.some((s) => s.toLowerCase().includes(categoryLower)) ||
      district.summary?.toLowerCase().includes(categoryLower)
    );
    setShownDistricts(filtered);
  };

  const displayDistricts = activeCategory ? shownDistricts : districts;

  return (
    <section className="panel map-board">
      <div className="map-toolbar">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            className="chip"
            data-active={activeCategory === category}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="map-canvas">
        <div className="map-ambient map-ambient-a" />
        <div className="map-ambient map-ambient-b" />
        <div className="map-grid">
          {displayDistricts.map((district) => (
            <article key={district.name} className="map-card" data-status={district.status}>
              <strong>{district.name}</strong>
              <p>{district.summary}</p>
              <span>Desert score {district.desertScore}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
