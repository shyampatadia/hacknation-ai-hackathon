from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.auth import router as auth_router
from app.routers.facilities import router as facilities_router
from app.routers.map import router as map_router
from app.routers.query import router as query_router

settings = get_settings()

app = FastAPI(
    title="Aarogya Intelligence API",
    version="0.1.0",
    description="FastAPI starter for crisis search, coverage mapping, and Supabase-backed operator auth.",
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
    return {"status": "ok", "env": settings.app_env}


app.include_router(auth_router)
app.include_router(query_router)
app.include_router(map_router)
app.include_router(facilities_router)
