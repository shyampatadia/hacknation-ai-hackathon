from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.auth import router as auth_router
from app.routers.facilities import router as facilities_router
from app.routers.map import router as map_router
from app.routers.query import router as query_router
from app.routers.voice import router as voice_router
from app.services.voice import get_transcriber_status, initialize_transcriber

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_transcriber()
    yield

app = FastAPI(
    title="Aarogya Intelligence API",
    version="0.1.0",
    description="FastAPI starter for crisis search, coverage mapping, and Supabase-backed operator auth.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "https://project-n4kab.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def healthcheck():
    voice_status = get_transcriber_status()
    healthy = voice_status.get("state") == "ready"
    return {
        "status": "ok" if healthy else "degraded",
        "env": settings.app_env,
        "voice": voice_status,
    }


app.include_router(auth_router)
app.include_router(query_router)
app.include_router(map_router)
app.include_router(facilities_router)
app.include_router(voice_router)
