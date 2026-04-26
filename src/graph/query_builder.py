def generate_query() -> str:
    query = """
    WITH node AS concept, score
    // ---------------- FACILITY EXPANSION ----------------
    MATCH (f:Facility)-[:HAS_CONCEPT]->(concept)

    RETURN {
        facility: {
            name: f.name,
            city: f.address_city,
            state: f.address_stateOrRegion,
            lat: f.latitude,
            lon: f.longitude,
            specialties: f.specialties
        }

    } AS metadata
"""
    return query