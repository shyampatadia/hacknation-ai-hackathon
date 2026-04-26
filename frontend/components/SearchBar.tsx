"use client";

import { useState } from "react";

import { VoiceButton } from "./VoiceButton";

type SearchBarProps = {
  placeholder: string;
  cta: string;
  chips: string[];
};

export function SearchBar({ placeholder, cta, chips }: SearchBarProps) {
  const [activeChip, setActiveChip] = useState(chips[0] ?? "");

  return (
    <div className="search-shell">
      <div className="search-row">
        <input className="search-input" type="text" placeholder={placeholder} />
        <button className="primary-button" type="button">
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
        {chips.map((chip) => (
          <button
            key={chip}
            className="chip"
            type="button"
            data-active={chip === activeChip}
            onClick={() => setActiveChip(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
