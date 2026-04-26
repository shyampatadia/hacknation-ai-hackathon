from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import re
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
# import httpx

from fastapi import WebSocket

from app.config import get_settings

try:
    import torch
except ImportError:  # pragma: no cover - optional runtime dependency
    torch = None

try:
    from liquid_audio import ChatState  # type: ignore
    from liquid_audio import LFM2AudioModel, LFM2AudioProcessor  # type: ignore
except ImportError:  # pragma: no cover - optional runtime dependency
    ChatState = None
    LFM2AudioModel = None
    LFM2AudioProcessor = None


SPECIAL_TOKEN_PATTERN = re.compile(r"<[^>\s]+>")
NON_WORD_TOKEN_PATTERN = re.compile(r"[^\w\s.,?!'\-]")


def utc_epoch() -> int:
    return int(time.time())


def _json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _urlsafe_b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


class VoiceSessionTokenError(ValueError):
    """Raised when a voice session token cannot be validated."""


class SessionPhase(str, Enum):
    CREATED = "created"
    READY = "ready"
    STREAMING = "streaming"
    FLUSHING = "flushing"
    CLOSED = "closed"


class WorkerEventKind(str, Enum):
    PARTIAL = "partial"
    FINAL = "final"
    ERROR = "error"


@dataclass(slots=True)
class VoiceSessionClaims:
    session_id: str
    issued_at: int
    expires_at: int
    sample_rate_hz: int
    language_hint: str | None = None


@dataclass(slots=True)
class TranscriptSegment:
    text: str
    start_ms: int
    end_ms: int
    seq: int


@dataclass(slots=True)
class WorkerEvent:
    session_id: str
    kind: WorkerEventKind
    seq: int
    text: str
    start_ms: int
    end_ms: int
    error_code: str | None = None


@dataclass(slots=True)
class AudioChunk:
    chunk_bytes: bytes
    received_at_ms: int


@dataclass(slots=True)
class SessionAudioState:
    sample_rate_hz: int
    channels: int = 1
    total_audio_bytes: int = 0
    partial_text: str = ""
    rolling_buffer: bytearray = field(default_factory=bytearray)
    finalized_buffer: bytearray = field(default_factory=bytearray)
    pending_bytes_since_partial: int = 0
    last_partial_monotonic: float = 0.0
    next_seq: int = 1
    last_emitted_seq: int = 0

    def append(self, chunk: bytes) -> None:
        self.total_audio_bytes += len(chunk)
        self.rolling_buffer.extend(chunk)
        self.finalized_buffer.extend(chunk)
        self.pending_bytes_since_partial += len(chunk)

    def make_segment(self, text: str) -> TranscriptSegment:
        duration_ms = int((self.total_audio_bytes / 2) / max(self.sample_rate_hz, 1) * 1000)
        seq = self.next_seq
        self.next_seq += 1
        return TranscriptSegment(
            text=text,
            start_ms=max(0, duration_ms - 800),
            end_ms=duration_ms,
            seq=seq,
        )


@dataclass(slots=True)
class VoiceGatewaySession:
    websocket: WebSocket
    claims: VoiceSessionClaims
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    audio_queue: asyncio.Queue[AudioChunk | None] = field(default_factory=lambda: asyncio.Queue(maxsize=64))
    audio_state: SessionAudioState = field(init=False)
    phase: SessionPhase = SessionPhase.CREATED
    audio_format: str = "pcm_s16le"
    language_hint: str | None = None
    worker_task: asyncio.Task[None] | None = None
    closed: bool = False
    close_reason: str | None = None
    last_activity_monotonic: float = field(default_factory=time.monotonic)
    worker_started_at_monotonic: float | None = None

    def __post_init__(self) -> None:
        self.audio_state = SessionAudioState(sample_rate_hz=self.claims.sample_rate_hz)

    def touch(self) -> None:
        self.last_activity_monotonic = time.monotonic()

    @property
    def queue_depth(self) -> int:
        return self.audio_queue.qsize()


class VoiceSessionSigner:
    """Issue and verify signed voice session tokens without extra dependencies."""

    def __init__(self) -> None:
        settings = get_settings()
        self.secret = settings.voice_token_secret.encode("utf-8")
        self.issuer = settings.voice_token_issuer
        self.ttl_seconds = settings.voice_session_ttl_seconds

    def issue(self, *, sample_rate_hz: int, language_hint: str | None) -> tuple[VoiceSessionClaims, str]:
        issued_at = utc_epoch()
        claims = VoiceSessionClaims(
            session_id=str(uuid.uuid4()),
            issued_at=issued_at,
            expires_at=issued_at + self.ttl_seconds,
            sample_rate_hz=sample_rate_hz,
            language_hint=language_hint,
        )
        payload = {
            "iss": self.issuer,
            "sid": claims.session_id,
            "iat": claims.issued_at,
            "exp": claims.expires_at,
            "sr": claims.sample_rate_hz,
            "lang": claims.language_hint,
        }
        body = _urlsafe_b64(_json_bytes(payload))
        signature = _urlsafe_b64(hmac.new(self.secret, body.encode("utf-8"), hashlib.sha256).digest())
        return claims, f"{body}.{signature}"

    def verify(self, token: str) -> VoiceSessionClaims:
        try:
            encoded_payload, encoded_signature = token.split(".", 1)
        except ValueError as exc:
            raise VoiceSessionTokenError("Malformed token.") from exc

        expected_signature = _urlsafe_b64(
            hmac.new(self.secret, encoded_payload.encode("utf-8"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(encoded_signature, expected_signature):
            raise VoiceSessionTokenError("Invalid signature.")

        payload = json.loads(_urlsafe_b64decode(encoded_payload))
        if payload.get("iss") != self.issuer:
            raise VoiceSessionTokenError("Invalid issuer.")
        if int(payload["exp"]) <= utc_epoch():
            raise VoiceSessionTokenError("Token expired.")

        return VoiceSessionClaims(
            session_id=payload["sid"],
            issued_at=int(payload["iat"]),
            expires_at=int(payload["exp"]),
            sample_rate_hz=int(payload["sr"]),
            language_hint=payload.get("lang"),
        )


class VoiceGatewaySessionManager:
    """Track active websocket sessions and basic gateway metrics."""

    def __init__(self) -> None:
        self._sessions: dict[str, VoiceGatewaySession] = {}
        self._lock = asyncio.Lock()
        self._max_concurrent = get_settings().voice_max_concurrent_sessions

    async def register(self, session: VoiceGatewaySession) -> None:
        async with self._lock:
            if len(self._sessions) >= self._max_concurrent:
                raise RuntimeError("Voice session capacity reached.")
            self._sessions[session.claims.session_id] = session

    async def unregister(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)

    def stats(self) -> dict[str, int]:
        sessions = list(self._sessions.values())
        phase_counts = {phase.value: 0 for phase in SessionPhase}
        for session in sessions:
            phase_counts[session.phase.value] += 1
        return {
            "active_sessions": len(sessions),
            "queue_depth": sum(session.queue_depth for session in sessions),
            "created_sessions": phase_counts[SessionPhase.CREATED.value],
            "ready_sessions": phase_counts[SessionPhase.READY.value],
            "streaming_sessions": phase_counts[SessionPhase.STREAMING.value],
            "flushing_sessions": phase_counts[SessionPhase.FLUSHING.value],
        }


class BaseRealtimeTranscriber:
    """Common interface for synchronous audio-to-text inference adapters."""

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate_hz: int, language_hint: str | None) -> str:
        raise NotImplementedError


class MockRealtimeTranscriber(BaseRealtimeTranscriber):
    """Development transcriber that emits deterministic transcript text without a model."""

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate_hz: int, language_hint: str | None) -> str:
        seconds = len(audio_bytes) / max(sample_rate_hz * 2, 1)
        if not audio_bytes:
            return ""
        if seconds < 1:
            return "Listening"
        return f"Captured approximately {seconds:.1f} seconds of audio for transcription."


class LiquidRealtimeTranscriber(BaseRealtimeTranscriber):
    """External API-backed ASR adapter using the configured Liquid model id."""

    def __init__(self) -> None:
        if LFM2AudioModel is None or LFM2AudioProcessor is None or ChatState is None:
            raise RuntimeError(
                "liquid-audio is not installed. Set VOICE_TRANSCRIBER_BACKEND=mock for local development."
            )
        if torch is None:
            raise RuntimeError("torch is not installed. Install torch to use the Liquid ASR backend.")
        settings = get_settings()
        self.model_id = settings.voice_model_id
        self.device = self._select_device()
        self.dtype_name = settings.voice_model_dtype.lower()
        self.dtype = self._select_dtype()
        # self.api_url = settings.voice_api_url
        # self.api_key = settings.voice_api_key
        # self.timeout_seconds = settings.voice_api_timeout_seconds
        # self.device = "external-api"
        # self.dtype = None

        self.processor = LFM2AudioProcessor.from_pretrained(
            self.model_id,
            device=self.device,
        ).eval()
        self.model = LFM2AudioModel.from_pretrained(
            self.model_id,
            device=self.device,
            dtype=self.dtype,
        ).eval()
        if hasattr(self.model, "to"):
            self.model = self.model.to(device=self.device, dtype=self.dtype)
        self._patch_conformer_input_dtype()
        # if not self.api_url:
        #     raise RuntimeError(
        #         "VOICE_API_URL is not configured. Set VOICE_API_URL to use the external transcription backend."
        #     )

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate_hz: int, language_hint: str | None) -> str:
        waveform = self._pcm16_bytes_to_waveform(audio_bytes)
        prompt = "Perform ASR."
        if language_hint:
            prompt = f"{prompt}\nPrefer transcription in language: {language_hint}."
        # if not audio_bytes:
        #     return ""

        chat = ChatState(self.processor)
        chat.new_turn("system")
        chat.add_text(prompt)
        chat.end_turn()
        # payload = {
        #     "model": self.model_id,
        #     "audio_format": "pcm_s16le",
        #     "sample_rate_hz": sample_rate_hz,
        #     "language_hint": language_hint,
        #     "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
        #     "max_new_tokens": get_settings().voice_max_new_tokens,
        # }
        # headers = {"Content-Type": "application/json"}
        # if self.api_key:
        #     headers["Authorization"] = f"Bearer {self.api_key}"

        chat.new_turn("user")
        chat.add_audio(waveform, sample_rate_hz)
        chat.end_turn()
        # with httpx.Client(timeout=self.timeout_seconds) as client:
        #     response = client.post(self.api_url, json=payload, headers=headers)
        #     response.raise_for_status()
        #     body = response.json()

        chat.new_turn("assistant")

        text_parts: list[str] = []
        try:
            with torch.inference_mode():
                with torch.autocast(device_type="cuda" if self.device == "cuda" else "cpu", enabled=False):
                    for token in self.model.generate_sequential(**chat, max_new_tokens=get_settings().voice_max_new_tokens):
                        if token.numel() == 1:
                            piece = self.processor.text.decode(token)
                            if piece:
                                text_parts.append(piece)
        except RuntimeError as exc:
            if self._should_fallback_to_float32(exc):
                self._fallback_to_float32()
                return self.transcribe_audio_bytes(audio_bytes, sample_rate_hz, language_hint)
            raise

        return self._sanitize_transcript("".join(text_parts))
        # text = self._extract_text(body)
        # return self._sanitize_transcript(text)
    def _pcm16_bytes_to_waveform(self, audio_bytes: bytes):
        pcm = torch.frombuffer(memoryview(audio_bytes), dtype=torch.int16).to(torch.float32)
        waveform = pcm / 32768.0
        return waveform.unsqueeze(0).to(self.device)

    def _sanitize_transcript(self, text: str) -> str:
        cleaned = SPECIAL_TOKEN_PATTERN.sub(" ", text)
        cleaned = NON_WORD_TOKEN_PATTERN.sub(" ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()

    def _patch_conformer_input_dtype(self) -> None:
        conformer = getattr(self.model, "conformer", None)
        original_forward_internal = getattr(conformer, "forward_internal", None)
        if conformer is None or original_forward_internal is None or getattr(conformer, "_aarogya_dtype_patch", False):
            return

        def patched_forward_internal(instance, audio_signal, length, *args, **kwargs):
            if hasattr(audio_signal, "dtype") and audio_signal.dtype != torch.float32:
                audio_signal = audio_signal.to(torch.float32)
            return original_forward_internal(audio_signal, length, *args, **kwargs)

        conformer.forward_internal = patched_forward_internal.__get__(conformer, type(conformer))
        conformer._aarogya_dtype_patch = True

    def _select_device(self) -> str:
        cuda_built = getattr(torch.version, "cuda", None) is not None
        if cuda_built and torch.cuda.is_available():
            return "cuda"
        return "cpu"

    def _select_dtype(self):
        if self.dtype_name == "auto":
            if self.device == "cuda":
                if hasattr(torch.cuda, "is_bf16_supported") and torch.cuda.is_bf16_supported():
                    return torch.bfloat16
                return torch.float16
            return torch.float32

        dtype_map = {
            "float32": torch.float32,
            "fp32": torch.float32,
            "float16": torch.float16,
            "fp16": torch.float16,
            "bfloat16": torch.bfloat16,
            "bf16": torch.bfloat16,
        }
        selected = dtype_map.get(self.dtype_name)
        if selected is None:
            raise RuntimeError(f"Unsupported VOICE_MODEL_DTYPE: {self.dtype_name}")
        if self.device == "cpu" and selected in {torch.float16, torch.bfloat16}:
            return torch.float32
        return selected

    def _should_fallback_to_float32(self, exc: RuntimeError) -> bool:
        message = str(exc)
        return self.dtype != torch.float32 and "Input type" in message and "bias type" in message

    # def _extract_text(self, body: Any) -> str:
    #     if isinstance(body, dict):
    #         for key in ("text", "transcript", "output_text"):
    #             value = body.get(key)
    #             if isinstance(value, str):
    #                 return value
    #         if isinstance(body.get("result"), dict):
    #             return self._extract_text(body["result"])
    #         if isinstance(body.get("data"), dict):
    #             return self._extract_text(body["data"])
    #         if isinstance(body.get("output"), list):
    #             text_parts = []
    #             for item in body["output"]:
    #                 if isinstance(item, dict):
    #                     content = item.get("content")
    #                     if isinstance(content, list):
    #                         for block in content:
    #                             if isinstance(block, dict) and isinstance(block.get("text"), str):
    #                                 text_parts.append(block["text"])
    #             if text_parts:
    #                 return " ".join(text_parts)
    #     raise RuntimeError("External transcription API response did not include transcript text.")

    def _fallback_to_float32(self) -> None:
        if self.dtype == torch.float32:
            return
        self.dtype = torch.float32
        if hasattr(self.model, "to"):
            self.model = self.model.to(device=self.device, dtype=self.dtype)
        _transcriber_status["dtype"] = str(self.dtype)



class VoiceTranscriptionWorker:
    """Session-scoped worker that turns inbound audio into ordered transcript events."""

    def __init__(self, transcriber: BaseRealtimeTranscriber) -> None:
        settings = get_settings()
        self.transcriber = transcriber
        self.partial_window_seconds = settings.voice_partial_window_seconds
        self.partial_step_seconds = settings.voice_partial_step_seconds
        self.min_partial_seconds = settings.voice_min_partial_seconds
        self.poll_interval_seconds = 0.25
        self._active_sessions = 0

    async def run(self, session: VoiceGatewaySession, event_handler) -> None:
        self._active_sessions += 1
        session.worker_started_at_monotonic = time.monotonic()
        try:
            while session.phase != SessionPhase.CLOSED:
                try:
                    item = await asyncio.wait_for(session.audio_queue.get(), timeout=self.poll_interval_seconds)
                except asyncio.TimeoutError:
                    continue
                if item is None:
                    await self._flush_final(session, event_handler)
                    break

                session.audio_state.append(item.chunk_bytes)
                if session.phase == SessionPhase.READY:
                    session.phase = SessionPhase.STREAMING
                await self._maybe_emit_partial(session, event_handler)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await event_handler(
                WorkerEvent(
                    session_id=session.claims.session_id,
                    kind=WorkerEventKind.ERROR,
                    seq=session.audio_state.next_seq,
                    text=str(exc),
                    start_ms=0,
                    end_ms=0,
                    error_code="worker_failure",
                )
            )
        finally:
            self._active_sessions = max(0, self._active_sessions - 1)

    async def enqueue_audio(self, session: VoiceGatewaySession, chunk_bytes: bytes, received_at_ms: int) -> None:
        try:
            session.audio_queue.put_nowait(AudioChunk(chunk_bytes=chunk_bytes, received_at_ms=received_at_ms))
        except asyncio.QueueFull as exc:
            raise RuntimeError("Audio backpressure exceeded for this session.") from exc

    async def finalize_session(self, session: VoiceGatewaySession) -> None:
        session.phase = SessionPhase.FLUSHING
        try:
            session.audio_queue.put_nowait(None)
        except asyncio.QueueFull:
            await session.audio_queue.put(None)

    async def _maybe_emit_partial(self, session: VoiceGatewaySession, event_handler) -> None:
        audio_state = session.audio_state
        bytes_per_second = audio_state.sample_rate_hz * 2
        min_partial_bytes = int(self.min_partial_seconds * bytes_per_second)
        partial_step_bytes = int(self.partial_step_seconds * bytes_per_second)
        if len(audio_state.rolling_buffer) < min_partial_bytes:
            return
        if audio_state.pending_bytes_since_partial < partial_step_bytes:
            return

        window_bytes = int(self.partial_window_seconds * bytes_per_second)
        audio_window = bytes(audio_state.rolling_buffer[-window_bytes:])
        text = await asyncio.to_thread(
            self.transcriber.transcribe_audio_bytes,
            audio_window,
            audio_state.sample_rate_hz,
            session.language_hint or session.claims.language_hint,
        )
        audio_state.pending_bytes_since_partial = 0
        audio_state.last_partial_monotonic = time.monotonic()
        if not text or text == audio_state.partial_text:
            return

        audio_state.partial_text = text
        segment = audio_state.make_segment(text)
        await event_handler(
            WorkerEvent(
                session_id=session.claims.session_id,
                kind=WorkerEventKind.PARTIAL,
                seq=segment.seq,
                text=segment.text,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
            )
        )

    async def _flush_final(self, session: VoiceGatewaySession, event_handler) -> None:
        audio_state = session.audio_state
        if not audio_state.finalized_buffer:
            return
        text = await asyncio.to_thread(
            self.transcriber.transcribe_audio_bytes,
            bytes(audio_state.finalized_buffer),
            audio_state.sample_rate_hz,
            session.language_hint or session.claims.language_hint,
        )
        if not text:
            return
        segment = audio_state.make_segment(text)
        await event_handler(
            WorkerEvent(
                session_id=session.claims.session_id,
                kind=WorkerEventKind.FINAL,
                seq=segment.seq,
                text=segment.text,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
            )
        )
        audio_state.partial_text = ""
        audio_state.rolling_buffer.clear()
        audio_state.finalized_buffer.clear()
        audio_state.pending_bytes_since_partial = 0

    def stats(self) -> dict[str, int]:
        return {"active_sessions": self._active_sessions}


_transcriber_instance: BaseRealtimeTranscriber | None = None
_worker_instance: VoiceTranscriptionWorker | None = None
_session_manager = VoiceGatewaySessionManager()
_signer = VoiceSessionSigner()
_transcriber_status: dict[str, str | None] = {
    "backend": get_settings().voice_transcriber_backend.lower(),
    # "requested_backend": get_settings().voice_transcriber_backend.lower(),
    "state": "uninitialized",
    "model_id": get_settings().voice_model_id,
    "device": None,
    "dtype": None,
    "error": None,
}


def get_signer() -> VoiceSessionSigner:
    return _signer


def get_session_manager() -> VoiceGatewaySessionManager:
    return _session_manager


def get_transcriber() -> BaseRealtimeTranscriber:
    global _transcriber_instance
    if _transcriber_instance is None:
        backend = get_settings().voice_transcriber_backend.lower()
        if backend == "liquid":
        # if backend in {"liquid", "external_api"}:
            _transcriber_instance = LiquidRealtimeTranscriber()
        # settings = get_settings()
        # requested_backend = settings.voice_transcriber_backend.lower()
        # backend = requested_backend
        # error_message: str | None = None

        # if requested_backend in {"liquid", "external_api"}:
        #     if settings.voice_api_url:
        #         _transcriber_instance = LiquidRealtimeTranscriber()
        #     else:
        #         backend = "mock"
        #         error_message = (
        #             "VOICE_API_URL is not configured for the external transcription backend. "
        #             "Falling back to mock transcription."
        #         )
        #         _transcriber_instance = MockRealtimeTranscriber()
        else:
            _transcriber_instance = MockRealtimeTranscriber()

        # _transcriber_status["requested_backend"] = requested_backend
        _transcriber_status["backend"] = backend
        _transcriber_status["state"] = "ready"
        _transcriber_status["error"] = None
        # _transcriber_status["error"] = error_message
        _transcriber_status["device"] = getattr(_transcriber_instance, "device", "cpu")
        dtype = getattr(_transcriber_instance, "dtype", None)
        _transcriber_status["dtype"] = str(dtype) if dtype is not None else None
    return _transcriber_instance


def get_worker() -> VoiceTranscriptionWorker:
    global _worker_instance
    if _worker_instance is None:
        _worker_instance = VoiceTranscriptionWorker(get_transcriber())
    return _worker_instance


def initialize_transcriber() -> None:
    """Eagerly load the configured transcription backend at server startup.

    Startup should not crash the whole API when optional voice dependencies are
    unavailable in deployment environments such as Vercel. The voice status
    surface exposes the failure through `/health` instead.
    """

    global _transcriber_instance, _worker_instance
    _transcriber_status["backend"] = get_settings().voice_transcriber_backend.lower()
    # _transcriber_status["requested_backend"] = get_settings().voice_transcriber_backend.lower()
    _transcriber_status["model_id"] = get_settings().voice_model_id
    try:
        _transcriber_instance = get_transcriber()
        _worker_instance = VoiceTranscriptionWorker(_transcriber_instance)
    except Exception as exc:
        _transcriber_instance = None
        _worker_instance = None
        _transcriber_status["state"] = "error"
        _transcriber_status["error"] = str(exc)
        _transcriber_status["device"] = None
        _transcriber_status["dtype"] = None


def get_transcriber_status() -> dict[str, Any]:
    """Return the current readiness snapshot for the voice transcription backend."""

    return {
        **dict(_transcriber_status),
        "gateway": {"state": "ready", **get_session_manager().stats()},
        "worker": {
            "state": "ready" if _worker_instance is not None else "uninitialized",
            **(_worker_instance.stats() if _worker_instance is not None else {"active_sessions": 0}),
        },
    }
