import { TrustBadge } from "@/components/TrustBadge";
import { mockFacilities } from "@/lib/mock-data";

export default function BrowsePage() {
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
          <strong>3</strong>
          <span>Flagged facilities in current view</span>
        </div>
      </div>

      <div className="filters">
        <select className="filter-select" defaultValue="jharkhand">
          <option value="all">All states</option>
          <option value="jharkhand">Jharkhand</option>
          <option value="bihar">Bihar</option>
          <option value="karnataka">Karnataka</option>
        </select>
        <select className="filter-select" defaultValue="maternal">
          <option value="all">All specialties</option>
          <option value="cardiac">Cardiac</option>
          <option value="maternal">Maternal</option>
          <option value="trauma">Trauma</option>
        </select>
        <select className="filter-select" defaultValue="60">
          <option value="50">Trust 50+</option>
          <option value="60">Trust 60+</option>
          <option value="75">Trust 75+</option>
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
          {mockFacilities.map((facility) => (
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
