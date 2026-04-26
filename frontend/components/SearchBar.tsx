"use client";

import { useState } from "react";

import { VoiceButton } from "./VoiceButton";
import { apiRoutes } from "@/lib/api";
import { FacilityCard } from "./FacilityCard";
import type { Facility } from "@/lib/mock-data";

type SearchBarProps = {
  placeholder: string;
  cta: string;
  chips: string[];
};

export function SearchBar({ placeholder, cta, chips }: SearchBarProps) {
  const [activeChip, setActiveChip] = useState(chips[0] ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [chips2, setChips2] = useState<Facility[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      // const response = await fetch(`${apiRoutes.crisisQuery}?language=auto&user_location=string&query=${encodeURIComponent(searchQuery)}`);
      const response = await fetch(apiRoutes.crisisQuery, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: searchQuery,
              language: "auto",
              user_location: "string"
            })
          });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setChips2(data['facilities']); 
      console.log("Search results:", data);
      // Handle the response data as needed, e.g., update state or navigate
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  return (
    <div className="search-shell">
      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="primary-button" type="button" onClick={handleSearch}>
          {cta}
        </button>
        <VoiceButton />
      </div>
      <div className="search-meta">
        <span>MODE: EMERGENCY</span>
        <span>LANGUAGE: AUTO</span>
        <span>RADIUS: 62KM</span>
      </div>
      <div className="chip-row">
        {chips2.map((chip) => (
          // <button
          //   key={chip["id"]}
          //   className="chip"
          //   type="button"
          //   data-active={chip["id"] === activeChip}
          //   onClick={() => setActiveChip(chip["id"])}
          // >
          //   {chip["name"]}
          // </button>
          <FacilityCard key={chip.id} facility={chip} />// debug:  onClick={() => setActiveChip(chip["id"])}
        ))}
      </div>
    </div>
  );
}
