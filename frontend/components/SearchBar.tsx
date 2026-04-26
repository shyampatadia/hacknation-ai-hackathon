"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VoiceButton } from "./VoiceButton";
import { apiRoutes } from "@/lib/api";
import { FacilityCard } from "./FacilityCard";
import { useRealtimeTranscription } from "@/hooks/useRealtimeTranscription";
import type { Facility } from "@/lib/mock-data";

type SearchBarProps = {
  placeholder: string;
  cta: string;
  chips: string[];
  prefillQuery?: string | null;
  onAgentResponse: any; // (response: string) => void;
};

export function SearchBar({ placeholder, cta, chips, prefillQuery, onAgentResponse }: SearchBarProps) {
  // const voiceAvailable = false;
  const [searchQuery, setSearchQuery] = useState("");
  const [chips2, setChips2] = useState<Facility[]>([]);
  const lastAutoSubmittedTranscriptRef = useRef("");

  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voice = useRealtimeTranscription();

  const voiceStatusText = useMemo(() => {
    // if (!voiceAvailable) {
    //   return "Voice search is temporarily unavailable while the API deploy is being slimmed down for Vercel.";
    // }
    if (voice.error) {
      return voice.error;
    }
    if (voice.connectionState === "recording") {
      return voice.partialText || "Listening for speech...";
    }
    if (voice.liveTranscript) {
      return voice.liveTranscript;
    }
    return "Tap voice to dictate a crisis query. Recording auto-submits after 3 seconds of silence.";
  }, [voice.connectionState, voice.error, voice.liveTranscript, voice.partialText]);
  // }, [voice.connectionState, voice.error, voice.liveTranscript, voice.partialText, voiceAvailable]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      setCoords(null);
    } else {
      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // console.log("Latitude:", position.coords.latitude);
          // console.log("Longitude:", position.coords.longitude);
 
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          setCoords({ latitude, longitude });

          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  useEffect(() => {
    if (voice.liveTranscript) {
      setSearchQuery(voice.liveTranscript);
    }
  }, [voice.liveTranscript]);

  useEffect(() => {
    if (prefillQuery) {
      setSearchQuery(prefillQuery);
    }
  }, [prefillQuery]);

  // useEffect(() => {
  //   if (voice.liveTranscript) {
  //     console.log("Voice transcription:", voice.liveTranscript);
  //   }
  // }, [voice.liveTranscript]);

  const handleVoiceToggle = async () => {
    if (voice.connectionState === "recording" || voice.connectionState === "connecting") {
      await voice.stop();
      return;
    }
    if (voice.connectionState === "error") {
      await voice.reset();
    }
    await voice.start();
  };

  const handleSearch = useCallback(async (queryOverride?: string) => {
    const query = (queryOverride ?? searchQuery).trim();
    if (!query) return;

      try {
        const response = await fetch(apiRoutes.crisisQuery, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                query,
                language: "auto",
                user_location: coords ? `${coords.latitude},${coords.longitude}` : "unknown"
              })
            });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const response2 = await fetch(apiRoutes.agentQuery, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                payload: query,
              })
            });

        if (!response2.ok) {
          throw new Error(`HTTP error! status: ${response2.status}`);
        }
        const data2 = await response2.json();

        onAgentResponse(data2.agent_response);

        setChips2(data['facilities']); 
        // console.log("Search results:", data);
        // Handle the response data as needed, e.g., update state or navigate
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    }, [coords, searchQuery]);

  useEffect(() => {
    if (
      voice.connectionState === "idle" &&
      voice.completionReason &&
      voice.finalTranscript &&
      voice.finalTranscript !== lastAutoSubmittedTranscriptRef.current
    ) {
      lastAutoSubmittedTranscriptRef.current = voice.finalTranscript;
      void handleSearch(voice.finalTranscript);
    }
  }, [handleSearch, voice.completionReason, voice.connectionState, voice.finalTranscript]);

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
        <button className="primary-button" type="button" onClick={() => void handleSearch()}>
          {cta}
        </button>
        <VoiceButton
          state={voice.connectionState}
          onClick={() => {
            void handleVoiceToggle();
          }}
          disabled={voice.connectionState === "stopping"}
          // disabled={!voiceAvailable || voice.connectionState === "stopping"}
        />
      </div>
      <div className="search-meta">
        <span>MODE: EMERGENCY</span>
        <span>LANGUAGE: AUTO</span>
        <span>RADIUS: 62KM</span>
      </div>
      <div className="voice-status" data-state={voice.connectionState}>
        <strong>VOICE</strong>
        <span>{voiceStatusText}</span>
      </div>
      <div className="chip-row">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="chip"
            onClick={() => setSearchQuery(`${chip} care`)}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="results">
        {chips2.map((chip) => (
          <FacilityCard key={chip.id} facility={chip} />
        ))}
      </div>
    </div>
  );
}
