# HackNation 2026: Serving A Nation

FastAPI backend implementing four documented endpoints:

- `POST /agent` for natural-language search with structured JSON results
- `POST /map` for choropleth region centroid lookup
- `POST /ingest_data` for batch upsert into the facility table
- `GET /download` for filtered, paginated JSON queries

The repo also includes checked-in pipeline assets for the production data flow:

- `infra/databricks/facility_records_pipeline.sql` for the Google Sheets -> Databricks -> Supabase serving table
- `infra/databricks/data_quality_checks.sql` for row-count, duplicate-id, and metadata checks
- `infra/fivetran/README.md` for connector setup notes
- `infra/samples/google_sheets_facilities_fixture.csv` as a fixture sheet payload

## Stack

- FastAPI + OpenAPI/Swagger
- SQLAlchemy for PostgreSQL-ready persistence
- OpenAI Python SDK for the agent adapter
- SQLite fallback for local development and tests

## Local Run

1. Install dependencies: `uv sync`
2. Apply migrations: `uv run alembic upgrade head`
3. Start the API: `uv run uvicorn main:app --reload`
4. Open Swagger docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Configuration

Environment variables use the `HACKNATION_` prefix:

- `HACKNATION_DATABASE_URL`
- `HACKNATION_OPENAI_API_KEY`
- `HACKNATION_OPENAI_MODEL`

If no database URL is provided, the app uses a local SQLite file. If no OpenAI key is set, `/agent` falls back to deterministic database-backed results.

For Supabase, set `HACKNATION_DATABASE_URL` to the project's Postgres connection string. In production, this app reads the curated `public.facility_records` table that is replicated from Databricks via Fivetran.

## Production Data Flow

1. Fivetran syncs a Google Sheets named range into `bronze_google_sheets.facilities_raw` in Databricks.
2. Databricks SQL materializes `silver.facilities_clean` and `gold.facility_records_serving`.
3. Fivetran syncs `gold.facility_records_serving` into Supabase Postgres as `public.facility_records`.
4. The FastAPI app reads `facility_records` through the configured `HACKNATION_DATABASE_URL`.
