import type { Facility } from "@/lib/mock-data";

import { TrustBadge } from "./TrustBadge";

type FacilityCardProps = {
  facility: Facility;
};

export function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <article className="facility-card panel">
      <div className="facility-head">
        <div>
          <h3>{facility.name}</h3>
          <p>
            {facility.city}, {facility.state} | {facility.distanceKm} km away
          </p>
        </div>
        <TrustBadge score={facility.trustScore} />
      </div>
      <div className="pill-row">
        {facility.specialties.map((specialty) => (
          <span key={specialty} className="pill">
            {specialty}
          </span>
        ))}
      </div>
      <div className="evidence">
        <strong>EVIDENCE</strong>
        <p>{facility.evidence}</p>
      </div>
      {facility.flags.length > 0 ? (
        <div className="flag-list">
          {facility.flags.map((flag) => (
            <span key={flag} className="flag">
              {flag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
