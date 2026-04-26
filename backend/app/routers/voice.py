from __future__ import annotations

import asyncio
import json
import time
from contextlib import suppress
from typing import Literal

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.voice import (
    SessionPhase,
    VoiceGatewaySession,
    VoiceSessionTokenError,
    WorkerEvent,
    WorkerEventKind,
    get_session_manager,
    get_signer,
    get_worker,
)

router = APIRouter(tags=["voice"])
settings = get_settings()


class VoiceSessionRequest(BaseModel):
    language_hint: str | None = Field(default=None, max_length=16)
    sample_rate_hz: int = Field(default=16000, ge=8000, le=48000)


class VoiceSessionResponse(BaseModel):
    session_id: str
    ws_url: str
    expires_at: str
    max_chunk_bytes: int


class SessionStartMessage(BaseModel):
    type: Literal["session.start"]
    audio_format: Literal["pcm_s16le"] = "pcm_s16le"
    sample_rate_hz: int = Field(default=16000, ge=8000, le=48000)
    channels: Literal[1] = 1
    language_hint: str | None = None


class SessionStopMessage(BaseModel):
    type: Literal["session.stop"]


class PingMessage(BaseModel):
    type: Literal["ping"]
    ts: int | float | str


@router.post("/api/voice/session")
async def create_voice_session(request: Request, payload: VoiceSessionRequest) -> VoiceSessionResponse:
    claims, token = get_signer().issue(
        sample_rate_hz=payload.sample_rate_hz,
        language_hint=payload.language_hint,
    )
    ws_url = f"{_resolve_voice_ws_public_url(request)}?token={token}"
    return VoiceSessionResponse(
        session_id=claims.session_id,
        ws_url=ws_url,
        expires_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(claims.expires_at)),
        max_chunk_bytes=settings.voice_max_chunk_bytes,
    )


@router.websocket("/ws/voice/transcribe")
async def transcribe_audio_ws(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4401, reason="Missing token.")
        return

    try:
        claims = get_signer().verify(token)
    except VoiceSessionTokenError as exc:
        await websocket.close(code=4401, reason=str(exc))
        return

    await websocket.accept(subprotocol="voice.v1")
    session = VoiceGatewaySession(websocket=websocket, claims=claims)
    manager = get_session_manager()
    worker = get_worker()

    try:
        await manager.register(session)
    except RuntimeError as exc:
        await websocket.send_json({"type": "error", "code": "capacity_reached", "message": str(exc)})
        await websocket.close(code=4429, reason=str(exc))
        return

    async def handle_worker_event(event: WorkerEvent) -> None:
        if event.seq <= session.audio_state.last_emitted_seq:
            return
        session.audio_state.last_emitted_seq = event.seq
        if event.kind == WorkerEventKind.PARTIAL:
            await _send_session_json(
                session,
                {
                    "type": "transcript.partial",
                    "text": event.text,
                    "start_ms": event.start_ms,
                    "end_ms": event.end_ms,
                    "seq": event.seq,
                },
            )
            return
        if event.kind == WorkerEventKind.FINAL:
            await _send_session_json(
                session,
                {
                    "type": "transcript.final",
                    "text": event.text,
                    "start_ms": event.start_ms,
                    "end_ms": event.end_ms,
                    "seq": event.seq,
                },
            )
            return
        await _send_session_json(
            session,
            {
                "type": "error",
                "code": event.error_code or "worker_failure",
                "message": event.text,
            },
        )
        session.close_reason = "worker_error"
        session.phase = SessionPhase.CLOSED

    try:
        while session.phase != SessionPhase.CLOSED:
            if time.monotonic() - session.last_activity_monotonic > settings.voice_idle_timeout_seconds:
                await _send_session_json(
                    session,
                    {"type": "error", "code": "idle_timeout", "message": "Voice session timed out due to inactivity."},
                )
                await worker.finalize_session(session)
                break

            try:
                message = await asyncio.wait_for(websocket.receive(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            session.touch()

            if message["type"] == "websocket.disconnect":
                session.phase = SessionPhase.CLOSED
                break

            if message.get("bytes") is not None:
                if session.phase not in {SessionPhase.READY, SessionPhase.STREAMING}:
                    await _send_session_json(
                        session,
                        {
                            "type": "error",
                            "code": "invalid_state",
                            "message": f"Audio frames not accepted while session is {session.phase.value}.",
                        },
                    )
                    continue
                chunk = message["bytes"]
                if len(chunk) > settings.voice_max_chunk_bytes:
                    await _send_session_json(
                        session,
                        {
                            "type": "error",
                            "code": "chunk_too_large",
                            "message": f"Chunk exceeds max size of {settings.voice_max_chunk_bytes} bytes.",
                        },
                    )
                    continue
                try:
                    await worker.enqueue_audio(session, chunk, int(time.time() * 1000))
                except RuntimeError as exc:
                    await _send_session_json(
                        session,
                        {"type": "error", "code": "backpressure", "message": str(exc)},
                    )
                    session.phase = SessionPhase.CLOSED
                    break
                continue

            if message.get("text") is not None:
                control = json.loads(message["text"])
                event_type = control.get("type")

                if event_type == "session.start":
                    start_payload = SessionStartMessage.model_validate(control)
                    if session.phase != SessionPhase.CREATED:
                        await _send_session_json(
                            session,
                            {
                                "type": "error",
                                "code": "invalid_state",
                                "message": f"session.start is not valid while session is {session.phase.value}.",
                            },
                        )
                        continue
                    session.audio_format = start_payload.audio_format
                    session.audio_state.sample_rate_hz = start_payload.sample_rate_hz
                    session.audio_state.channels = start_payload.channels
                    session.language_hint = start_payload.language_hint
                    session.phase = SessionPhase.READY
                    if session.worker_task is None or session.worker_task.done():
                        session.worker_task = _create_worker_task(session, worker, handle_worker_event)
                    await _send_session_json(
                        session,
                        {
                            "type": "session.ready",
                            "session_id": claims.session_id,
                            "audio_format": session.audio_format,
                            "sample_rate_hz": session.audio_state.sample_rate_hz,
                            "channels": session.audio_state.channels,
                            "max_chunk_bytes": settings.voice_max_chunk_bytes,
                        },
                    )
                    continue

                if event_type == "ping":
                    PingMessage.model_validate(control)
                    await _send_session_json(session, {"type": "pong"})
                    continue

                if event_type == "session.stop":
                    SessionStopMessage.model_validate(control)
                    if session.phase not in {SessionPhase.READY, SessionPhase.STREAMING}:
                        await _send_session_json(
                            session,
                            {
                                "type": "error",
                                "code": "invalid_state",
                                "message": f"session.stop is not valid while session is {session.phase.value}.",
                            },
                        )
                        continue
                    session.phase = SessionPhase.FLUSHING
                    await worker.finalize_session(session)
                    break

                await _send_session_json(
                    session,
                    {
                        "type": "error",
                        "code": "invalid_message",
                        "message": f"Unsupported message type: {event_type}",
                    },
                )

        if session.worker_task is not None:
            await session.worker_task

        session.phase = SessionPhase.CLOSED
        await _send_session_json(session, {"type": "session.closed", "session_id": claims.session_id})
    except WebSocketDisconnect:
        session.phase = SessionPhase.CLOSED
    except Exception as exc:
        with suppress(RuntimeError):
            await _send_session_json(
                session,
                {"type": "error", "code": "internal_error", "message": str(exc)},
            )
    finally:
        if session.worker_task is not None and not session.worker_task.done():
            session.worker_task.cancel()
            with suppress(asyncio.CancelledError):
                await session.worker_task
        session.phase = SessionPhase.CLOSED
        await manager.unregister(claims.session_id)
        with suppress(RuntimeError):
            await websocket.close()


def _create_worker_task(session: VoiceGatewaySession, worker, event_handler):
    return asyncio.create_task(worker.run(session, event_handler), name=f"voice-worker-{session.claims.session_id}")


async def _send_session_json(session: VoiceGatewaySession, payload: dict[str, object]) -> None:
    async with session.send_lock:
        await session.websocket.send_json(payload)


def _resolve_voice_ws_public_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")

    scheme = forwarded_proto or request.url.scheme
    ws_scheme = "wss" if scheme == "https" else "ws"
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    return f"{ws_scheme}://{host}/ws/voice/transcribe"
