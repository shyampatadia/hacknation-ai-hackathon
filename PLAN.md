
# VF Hackathon — India Medical Facility Intelligence Agent

This plan outlines **methods and architecture** to query the 10k Indian facility dataset, including pre-processing, semantic search, graph DB, agent design, and a Lovable dashboard for crisis mapping. It is a methodology document plus a buildable Lovable app for the dashboard layer.

---

## 1. Data Layer — Pre-processing & Derived Columns

The raw sheet mixes structured fields (PIN, state, beds, specialties) with free-form text (equipment logs, availability claims, staff notes). Build these derived columns in Databricks (Delta Lake) before indexing:

### Cleaning / normalization
- `pin_code_clean` — zero-padded 6-digit string; reject invalid.
- `state_norm`, `district_norm` — fuzzy-mapped to canonical India admin list (use `rapidfuzz`).
- `is_rural` — boolean from PIN-code → urban/rural lookup (Census 2011 PIN classification).
- `lat`, `lon` — geocoded once via PIN centroid table; cached.
- `geohash5` — for spatial bucketing / nearest-neighbour pre-filter.

### Extraction from free text (LLM + regex hybrid)
- `equipment_list[]` — normalized equipment names extracted from logs (CT, MRI, ventilator, C-arm, anesthesia machine…).
- `specialties[]` — canonicalized to a controlled vocabulary (cardiology, ortho, OB-GYN, general surgery, anesthesiology…).
- `staff_roster[{role, count, employment_type}]` — parsed from staff text. Employment type ∈ {full_time, part_time, visiting, on_call}.
- `hours_24x7` — boolean derived from availability claims; `hours_text_evidence` keeps the source span.
- `procedures_offered[]` — controlled vocab (e.g. appendectomy, C-section, dialysis, angioplasty).
- `emergency_capable` — boolean (ER + anesthesia + OT + 24x7).

### Citation columns (critical for traceability)
For every extracted field, store:
- `<field>_evidence_text` — the exact sentence extracted from.
- `<field>_evidence_offset` — `{start, end, source_column}`.
- `<field>_extractor_version` — model + prompt hash.

This is what the agent later cites at row level.

### Trust Scorer derived columns
Rule-based + ML hybrid, materialized at write time:
- `flag_surgery_no_anesth` — claims surgery but `anesthesiologist_count == 0`.
- `flag_24x7_no_night_staff` — 24/7 claim but no night-shift roster.
- `flag_advanced_no_equipment` — "advanced cardiac" but no cath lab / ECG.
- `flag_bed_staff_ratio` — beds/clinical-staff outside plausible bounds.
- `flag_specialty_orphan` — specialty listed with zero matching specialists.
- `completeness_score` — % of required fields populated.
- `consistency_score` — 1 − (weighted flag count).
- `trust_score` — `0.5*consistency + 0.3*completeness + 0.2*evidence_density`.
- `trust_reasons[]` — list of `{rule_id, evidence_text, severity}`.

---

## 2. Storage & Index Topology

Three complementary stores, each playing to its strength:

```text
                ┌────────────────────────────┐
                │  Databricks Delta Lake     │  ← source of truth, versioned
                │  facilities, evidence,     │
                │  flags, embeddings col     │
                └──────┬───────────┬─────────┘
                       │           │
        ┌──────────────┘           └──────────────┐
        ▼                                          ▼
┌────────────────────┐                  ┌────────────────────┐
│ Vector Index       │                  │ Neo4j Graph        │
│ (Databricks Vector │                  │ Facility─OFFERS→   │
│  Search / pgvector)│                  │ Procedure, REQUIRES│
│ chunks of evidence │                  │ →Equipment/Role    │
│ + facility_id      │                  │ LOCATED_IN→PIN     │
└────────────────────┘                  └────────────────────┘
```

### Vector / semantic index
- **Chunk unit**: one evidence sentence (not whole row) so citations are atomic.
- **Metadata**: `facility_id`, `field`, `pin_code`, `state`, `is_rural`, `trust_score`, `geohash5`.
- **Hybrid retrieval**: BM25 + dense (e.g. `bge-m3` or `text-embedding-3-large`) with reciprocal-rank fusion.
- **Pre-filters** applied before vector search: state, rural flag, geohash neighbours, min trust score.

### Neo4j knowledge graph
Nodes: `Facility`, `Procedure`, `Equipment`, `StaffRole`, `Specialty`, `PINCode`, `District`, `State`.
Relationships:
- `(Facility)-[:OFFERS]->(Procedure)`
- `(Procedure)-[:REQUIRES]->(Equipment|StaffRole)`  ← medical-standards graph (seeded from guidelines)
- `(Facility)-[:HAS_EQUIPMENT {count}]->(Equipment)`
- `(Facility)-[:EMPLOYS {count, type}]->(StaffRole)`
- `(Facility)-[:LOCATED_IN]->(PINCode)-[:IN]->(District)-[:IN]->(State)`

This graph powers two things the vector index can't:
1. **Multi-hop reasoning** ("offers appendectomy AND has anesthesiologist AND in rural Bihar").
2. **Validator agent** — Cypher query checks `OFFERS` minus `HAS_EQUIPMENT` / `EMPLOYS REQUIRES` to detect inconsistency, feeding the trust scorer.

### Spatial index
PostGIS or Databricks H3 for "nearest facility within radius" — returns candidate IDs that vector + graph then filter.

---

## 3. Agent Design (LangGraph / Databricks Mosaic Agent)

```text
User Query
   │
   ▼
┌──────────────────┐
│ Planner LLM      │ classifies: lookup | multi-attribute | spatial | trust-audit
└──────┬───────────┘
       ▼
┌──────────────────┐    parallel
│ Retrieval Tools  │────────────────┐
│ • vector_search  │                │
│ • cypher_query   │                │
│ • spatial_knn    │                │
│ • sql_filter     │                │
└──────┬───────────┘                │
       ▼                            │
┌──────────────────┐                │
│ Validator Agent  │ ◄──────────────┘
│ cross-checks vs  │
│ medical-standard │
│ subgraph         │
└──────┬───────────┘
       ▼
┌──────────────────┐
│ Synthesizer LLM  │ produces answer + citations + trust deltas
└──────────────────┘
```

### Example: "nearest facility in rural Bihar that can perform an emergency appendectomy and typically leverages part-time doctors"
1. Planner extracts slots: `procedure=appendectomy`, `emergency=true`, `state=Bihar`, `is_rural=true`, `staff_employment=part_time`, `proximity=user_pin`.
2. `sql_filter` on Delta: `state_norm='Bihar' AND is_rural AND emergency_capable`.
3. `cypher_query`: facilities `OFFERS appendectomy` AND `EMPLOYS {type:'part_time'}` doctor.
4. `spatial_knn` ranks by haversine from user PIN.
5. `vector_search` retrieves evidence sentences for each candidate.
6. Validator confirms `REQUIRES(appendectomy)` (anesthesia, OT, surgeon) is satisfied by `HAS_EQUIPMENT`/`EMPLOYS`.
7. Synthesizer returns top-N with cited sentences + trust score.

### Self-correction loop (Validator Agent)
- Runs after primary retrieval and again after synthesis.
- Re-issues Cypher: `MATCH (f)-[:OFFERS]->(p)-[:REQUIRES]->(r) WHERE NOT (f)-[:HAS_EQUIPMENT|EMPLOYS]->(r) RETURN f,p,r`.
- If hallucination detected (claim not backed by evidence chunk), forces re-retrieval with stricter filters or downgrades the answer.

### Traceability with MLflow 3 Tracing
Wrap every tool call (`@mlflow.trace`) so the UI can render planner → tool calls → validator decisions → final answer, each node showing inputs/outputs and the cited evidence row.

---

## 4. Trust Scorer — formal logic

```text
trust_score(f) = 0.5·consistency + 0.3·completeness + 0.2·evidence_density

consistency = 1 − Σ(weight_i · flag_i) / Σ weight_i
flags:
  surgery_no_anesth          w=0.30
  advanced_no_equipment      w=0.25
  24x7_no_night_staff        w=0.15
  bed_staff_ratio_outlier    w=0.15
  specialty_orphan           w=0.10
  contradictory_hours        w=0.05

evidence_density = extracted_fields_with_citations / extracted_fields_total
```
Flags computed in Databricks SQL + Cypher; persisted; surfaced in UI with the source sentence.

---

## 5. Lovable Dashboard — Dynamic Crisis Map

Built in this Lovable app (React + Vite + Tailwind). Backend endpoints proxy to Databricks SQL Warehouse via the Databricks connector (already documented).

Pages/components:
- **/map** — India choropleth by PIN/district. Color = inverse of average `trust_score` × facility-density gap. Identifies "medical deserts".
  - Library: `react-leaflet` + `leaflet.markercluster`; GeoJSON of India PINs/districts.
  - Layers toggle: Trust score, Emergency-capable density, Rural-only, Specialty heatmap.
- **/facility/:id** — detail panel: structured fields, extracted fields with hover-citation (highlights source sentence), trust flags with reasons, validator status badge.
- **/agent** — chat interface; sends query to Databricks agent endpoint; renders MLflow trace timeline (planner → tools → validator → answer); each cited claim is a clickable chip that opens the facility panel scrolled to the evidence span.
- **/audit** — sortable table of lowest-trust facilities, filter by flag type, export CSV.

Data flow:
- Edge function (Lovable Cloud) calls Databricks SQL Statements API via the Databricks connector gateway (`https://connector-gateway.lovable.dev/databricks/2.0/sql/statements`) for map aggregates.
- A second edge function calls the deployed agent endpoint for /agent queries and streams MLflow trace events.

---

## 6. Build sequence (if you approve)

1. Scaffold Lovable app shell: routes `/map`, `/facility/:id`, `/agent`, `/audit`, shared layout, design tokens.
2. Stub typed API client + mock JSON for 50 sample facilities so UI is functional offline.
3. Add Leaflet India map with mocked trust-score choropleth + cluster markers.
4. Build facility detail panel with citation highlighting component.
5. Build agent chat UI with trace timeline component (collapsible nodes).
6. Wire Databricks connector + edge functions once you're ready to point at the real warehouse and agent endpoint.

---

## 7. Technical notes (for the technical reader)

- **Embeddings**: prefer multilingual (`bge-m3`) — Indian facility text mixes English, Hindi, regional script transliteration.
- **Chunking**: sentence-level with 1-sentence overlap; keep `(facility_id, field, char_span)` for exact citation.
- **Vector store**: Databricks Vector Search if staying in-platform; pgvector via Lovable Cloud if you want everything in Supabase.
- **Graph hosting**: Neo4j AuraDB free tier is enough for 10k facilities; or use Databricks GraphFrames if you want to avoid a second system at the cost of weaker Cypher ergonomics.
- **Tracing**: MLflow 3 `@trace` decorators on each tool; export trace JSON to the frontend so the timeline component can render without a live MLflow server.
- **Validator**: deterministic Cypher rules first, LLM judge second (only for ambiguous cases) to control cost and latency.
- **Caching**: cache PIN→lat/lon, district aggregates, and top-N agent answers in Supabase to keep the map snappy.

Approve this plan and I'll start with step 1 (app scaffold + mocked map and agent UI), so you can see the dashboard working before wiring Databricks.

