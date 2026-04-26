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
    voice_ws_public_url: str
    voice_token_secret: str
    voice_token_issuer: str
    voice_session_ttl_seconds: int
    voice_max_concurrent_sessions: int
    voice_idle_timeout_seconds: int
    voice_max_chunk_bytes: int
    voice_model_id: str
    voice_model_dtype: str
    # voice_api_url: str | None
    # voice_api_key: str | None
    # voice_api_timeout_seconds: float
    voice_transcriber_backend: str
    voice_partial_window_seconds: float
    voice_partial_step_seconds: float
    voice_min_partial_seconds: float
    voice_max_new_tokens: int
    supabase_url: str
    supabase_publishable_key: str
    supabase_service_role_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:8000"),
        voice_ws_public_url=os.getenv("VOICE_WS_PUBLIC_URL", "ws://localhost:8000/ws/voice/transcribe"),
        voice_token_secret=os.getenv("VOICE_TOKEN_SECRET", "dev-voice-secret"),
        voice_token_issuer=os.getenv("VOICE_TOKEN_ISSUER", "aarogya-intelligence"),
        voice_session_ttl_seconds=int(os.getenv("VOICE_SESSION_TTL_SECONDS", "900")),
        voice_max_concurrent_sessions=int(os.getenv("VOICE_MAX_CONCURRENT_SESSIONS", "25")),
        voice_idle_timeout_seconds=int(os.getenv("VOICE_IDLE_TIMEOUT_SECONDS", "20")),
        voice_max_chunk_bytes=int(os.getenv("VOICE_MAX_CHUNK_BYTES", "6400")),
        voice_model_id=os.getenv("LIQUID_MODEL_ID", "LiquidAI/LFM2.5-Audio-1.5B"),
        voice_model_dtype=os.getenv("VOICE_MODEL_DTYPE", "auto"),
        # voice_api_url=os.getenv("VOICE_API_URL"),
        # voice_api_key=os.getenv("VOICE_API_KEY"),
        # voice_api_timeout_seconds=float(os.getenv("VOICE_API_TIMEOUT_SECONDS", "30")),
        voice_transcriber_backend=os.getenv("VOICE_TRANSCRIBER_BACKEND", "mock"),
        voice_partial_window_seconds=float(os.getenv("VOICE_PARTIAL_WINDOW_SECONDS", "1.0")),
        voice_partial_step_seconds=float(os.getenv("VOICE_PARTIAL_STEP_SECONDS", "0.5")),
        voice_min_partial_seconds=float(os.getenv("VOICE_MIN_PARTIAL_SECONDS", "0.6")),
        voice_max_new_tokens=int(os.getenv("VOICE_MAX_NEW_TOKENS", "96")),
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
