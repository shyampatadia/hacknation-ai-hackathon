from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_env: str
    frontend_url: str
    backend_url: str
    supabase_url: str
    supabase_publishable_key: str
    supabase_service_role_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:8000"),
        supabase_url=_required_env("NEXT_PUBLIC_SUPABASE_URL"),
        supabase_publishable_key=_required_env(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fallback="NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ),
        supabase_service_role_key=_required_env("SUPABASE_SERVICE_ROLE_KEY"),
    )


def _required_env(name: str, fallback: str | None = None) -> str:
    value = os.getenv(name)

    if value:
        return value

    if fallback:
        fallback_value = os.getenv(fallback)
        if fallback_value:
            return fallback_value

    raise RuntimeError(f"Missing required environment variable: {name}")
