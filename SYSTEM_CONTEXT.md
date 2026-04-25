# Aarogya Intelligence System Context

This file is the implementation-level context for the current repo state.

It is separate from `README.md`.

- `README.md` is the product and system-design document.
- `SYSTEM_CONTEXT.md` is the current engineering reality of what has actually been scaffolded in this repository.

## 1. What This Repo Is

This repo is currently a two-service starter for **Aarogya Intelligence**:

- `frontend/`: Next.js application
- `backend/`: FastAPI application

The system is intended to support:

- crisis healthcare search
- district desert mapping
- facility browsing and audit workflows
- Supabase-backed user identity and profile management
- later Databricks-backed retrieval, trust scoring, and analytics

## 2. Current Repo Layout

```text
hacknation-ai-hackathon/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── .env.local
│   ├── .env.example
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── mock_data.py
│   │   └── models.py
│   ├── supabase/
│   │   └── schema.sql
│   ├── .env
│   ├── .env.example
│   ├── .venv/
│   ├── pyproject.toml
│   └── uv.lock
├── README.md
├── SYSTEM_CONTEXT.md
└── .gitignore
```

## 3. Frontend Status

The frontend is implemented as a **Next.js App Router** app.

Primary pages:

- `frontend/app/page.tsx`
  Crisis search landing page, currently designed as an operations console.
- `frontend/app/map/page.tsx`
  Desert map shell.
- `frontend/app/browse/page.tsx`
  Facility browser shell.
- `frontend/app/auth/page.tsx`
  Supabase sign-in and profile bootstrap page.

Key frontend component files:

- `frontend/components/SearchBar.tsx`
- `frontend/components/FacilityCard.tsx`
- `frontend/components/AgentTrace.tsx`
- `frontend/components/OperationsPanel.tsx`
- `frontend/components/QuerySnapshot.tsx`
- `frontend/components/AuthCard.tsx`

Frontend data state today:

- UI currently uses mock data for crisis results, facility list, and desert map
- auth page is real enough to talk to the backend auth endpoints
- homepage is still a scaffold, but more operational than the earlier draft

## 4. Backend Status

The backend is implemented as a **FastAPI** service under `backend/app/`.

Entry point:

- `backend/app/main.py`

Current backend routers:

- `backend/app/routers/auth.py`
- `backend/app/routers/query.py`
- `backend/app/routers/map.py`
- `backend/app/routers/facilities.py`

Current backend behavior:

- `/health` works
- `/api/query/crisis` returns mocked crisis results
- `/api/map/deserts` returns mocked district data
- `/api/facilities` returns mocked facility data
- `/api/auth/me` requires a bearer token and validates it against Supabase
- `/api/auth/profile` reads and writes the `user_profiles` table in Supabase using the service role key

The backend is not yet connected to:

- Databricks SQL
- Vector search
- Tavily
- OpenAI
- MLflow

## 5. Auth Model

Auth ownership is intentionally split like this:

- **Supabase** owns identity, sessions, user profiles, and role-aware application data
- **Databricks** should own healthcare intelligence data, retrieval, trust scores, and analytics

This is deliberate. Databricks should not become the user database.

### Frontend auth flow

The frontend uses Supabase client auth:

- magic-link / OTP sign-in from `frontend/components/AuthCard.tsx`
- session is held by the Supabase browser client

Relevant frontend auth files:

- `frontend/lib/supabase/client.ts`
- `frontend/lib/auth-api.ts`
- `frontend/components/AuthCard.tsx`

### Backend auth flow

The backend expects:

- `Authorization: Bearer <supabase-access-token>`

It validates the incoming token by calling Supabase Auth.

Relevant backend auth files:

- `backend/app/dependencies.py`
- `backend/app/services/supabase.py`
- `backend/app/routers/auth.py`

## 6. Supabase Schema

Current starter schema file:

- `backend/supabase/schema.sql`

It defines:

- `user_profiles`
- `saved_searches`
- `saved_facilities`
- RLS policies for self-owned access
- `updated_at` trigger for `user_profiles`

Expected roles currently supported:

- `public_user`
- `asha_worker`
- `ngo_planner`
- `government_auditor`
- `admin`

## 7. Environment Variables

There are now separate env files by service.

### Frontend env

Live file:

- `frontend/.env.local`

Template:

- `frontend/.env.example`

Key frontend env vars:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

### Backend env

Live file:

- `backend/.env`

Template:

- `backend/.env.example`

Key backend env vars:

- `APP_ENV`
- `FRONTEND_URL`
- `BACKEND_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `TAVILY_API_KEY`
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_WAREHOUSE_ID`
- `DATABRICKS_CATALOG`
- `DATABRICKS_SCHEMA`
- `DATABRICKS_VECTOR_SEARCH_ENDPOINT`
- `DATABRICKS_VECTOR_INDEX`
- `MLFLOW_TRACKING_URI`

## 8. Tooling and Dependency Management

### Frontend

- package manager: `npm`
- framework: `Next.js`
- language: `TypeScript`

Primary commands:

```powershell
cd frontend
npm run dev
npm run typecheck
npm run build
```

### Backend

- dependency manager: `uv`
- framework: `FastAPI`
- language: `Python 3.12`
- virtual environment location: `backend/.venv`

Primary commands:

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## 9. UI Direction

The original scaffold leaned too much toward a pitch-deck feel and explicit persona explanation.

That was partially corrected.

Current UI direction:

- cooler operational palette
- homepage framed as a command center
- right rail shows system state instead of user-persona exposition
- query interpretation snapshot added
- operational metrics added

This is still not final-quality UI.

What remains weak:

- homepage still mixes explanation and action
- map page is still placeholder-heavy
- browse page is still basic table scaffolding
- there is no real live query state yet because crisis search still uses mock data

## 10. What Is Real vs Mock Right Now

### Real

- frontend app structure
- backend app structure
- separate `frontend/` and `backend/` services
- `uv`-managed backend project
- backend `.venv` inside `backend/`
- Supabase browser auth wiring
- backend bearer-token guard
- backend Supabase profile fetch/upsert implementation
- Supabase schema starter

### Mocked

- crisis search results
- facility browse results
- desert map district data
- query ranking logic
- trust score generation
- contradiction reasoning
- Databricks retrieval
- Tavily enrichment
- OpenAI-based reasoning

## 11. Current API Surface

### Health

- `GET /health`

### Auth

- `GET /api/auth/me`
- `GET /api/auth/profile`
- `POST /api/auth/profile`

### Crisis Query

- `POST /api/query/crisis`

### Map

- `GET /api/map/deserts`

### Facilities

- `GET /api/facilities`

## 12. Current Constraints

There are several important constraints to be aware of:

- backend auth profile writes assume the Supabase schema has been created
- frontend auth UX depends on valid Supabase project settings and email auth configuration
- backend does not yet persist saved searches or saved facilities
- no Databricks integration exists yet despite env scaffolding
- no Mapbox rendering is wired yet, only UI placeholders
- no MLflow tracing is implemented yet
- no deployment config exists yet for Railway or Vercel

## 13. Recommended Next Engineering Steps

The next sensible sequence is:

1. Run `backend/supabase/schema.sql` in Supabase SQL editor
2. Confirm Supabase email auth is enabled and magic-link flow works end-to-end
3. Wire homepage search to `POST /api/query/crisis`
4. Replace mocked backend results with Databricks-backed retrieval
5. Add saved searches and saved facilities persistence
6. Add Mapbox integration on the map page
7. Add role-aware page behavior for planner/auditor flows
8. Add deployment configuration for frontend and backend

## 14. Operational Commands

From repo root:

### Start frontend

```powershell
cd frontend
npm run dev
```

### Start backend

```powershell
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

### Sync backend deps

```powershell
cd backend
uv sync
```

### Build frontend

```powershell
cd frontend
npm run build
```

## 15. Security Notes

- Do not commit real secrets from `frontend/.env.local` or `backend/.env`
- `SUPABASE_SERVICE_ROLE_KEY` is backend-only
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe for frontend use
- if any real secrets were exposed outside the local machine, rotate them

## 16. Bottom Line

This repo is no longer a single loose prototype folder.

It is now:

- a separated frontend/backend project
- with `uv`-managed Python backend dependencies
- with `backend/.venv`
- with Supabase-backed auth/profile scaffolding
- with a Next.js operational UI scaffold
- and with clear placeholders where Databricks, Tavily, and OpenAI still need to be integrated

