"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRoutes, buildVoiceWsUrl } from "@/lib/api";

export type TranscriptSegment = {
  text: string;
  startMs: number;
  endMs: number;
  seq: number;
};

type ConnectionState = "idle" | "connecting" | "recording" | "stopping" | "error";
type StopReason = "manual" | "silence" | null;
type WorkletPayload = {
  samples: Float32Array;
  rms: number;
};

type ServerEvent =
  | { type: "session.ready"; session_id: string; max_chunk_bytes: number }
  | { type: "transcript.partial"; text: string; start_ms: number; end_ms: number; seq: number }
  | { type: "transcript.final"; text: string; start_ms: number; end_ms: number; seq: number }
  | { type: "error"; code: string; message: string }
  | { type: "session.closed"; session_id: string }
  | { type: "pong" };

const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_MAX_CHUNK_BYTES = 2400;
const TARGET_CHUNK_DURATION_MS = 75;
const DEFAULT_FLUSH_SAMPLES = Math.floor((TARGET_SAMPLE_RATE * TARGET_CHUNK_DURATION_MS) / 1000);
const SILENCE_RMS_THRESHOLD = 0.015;
const SILENCE_TIMEOUT_MS = 1500;

export function useRealtimeTranscription() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [partialText, setPartialText] = useState("");
  const [finalSegments, setFinalSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completionReason, setCompletionReason] = useState<StopReason>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const pendingPcmRef = useRef<Int16Array[]>([]);
  const isStoppingRef = useRef(false);
  const stopReasonRef = useRef<StopReason>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);
  const currentStateRef = useRef<ConnectionState>("idle");
  const stopRef = useRef<(reason?: StopReason) => Promise<void>>(async () => {});
  const lastServerSeqRef = useRef(0);
  const maxChunkBytesRef = useRef(DEFAULT_MAX_CHUNK_BYTES);

  useEffect(() => {
    currentStateRef.current = connectionState;
  }, [connectionState]);

  const finalTranscript = useMemo(() => finalSegments.map((segment) => segment.text).filter(Boolean).join(" ").trim(), [finalSegments]);
  const liveTranscript = useMemo(
    () => [finalTranscript, partialText].filter(Boolean).join(" ").trim(),
    [finalTranscript, partialText],
  );

  const teardownAudio = useCallback(async () => {
    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    pendingPcmRef.current = [];
    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current = null;
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const reset = useCallback(async () => {
    socketRef.current?.close();
    socketRef.current = null;
    isStoppingRef.current = false;
    stopReasonRef.current = null;
    silenceStartedAtRef.current = null;
    speechDetectedRef.current = false;
    await teardownAudio();
    setConnectionState("idle");
    setPartialText("");
    setFinalSegments([]);
    setError(null);
    setCompletionReason(null);
  }, [teardownAudio]);

  const flushPendingPcm = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (pendingPcmRef.current.length === 0) {
      return;
    }
    const totalLength = pendingPcmRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of pendingPcmRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    pendingPcmRef.current = [];
    const maxSamplesPerFrame = Math.max(1, Math.floor(maxChunkBytesRef.current / Int16Array.BYTES_PER_ELEMENT));
    for (let index = 0; index < merged.length; index += maxSamplesPerFrame) {
      const frame = merged.subarray(index, index + maxSamplesPerFrame);
      socket.send(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength));
    }
  }, []);

  const handleWorkletMessage = useCallback(
    (event: MessageEvent<WorkletPayload>) => {
      const { samples: float32, rms } = event.data;
      const now = performance.now();

      if (rms >= SILENCE_RMS_THRESHOLD) {
        speechDetectedRef.current = true;
        silenceStartedAtRef.current = null;
      } else if (
        speechDetectedRef.current &&
        currentStateRef.current === "recording" &&
        !isStoppingRef.current
      ) {
        silenceStartedAtRef.current ??= now;
        if (now - silenceStartedAtRef.current >= SILENCE_TIMEOUT_MS) {
          void stopRef.current("silence");
          return;
        }
      }

      const pcm = new Int16Array(float32.length);
      for (let index = 0; index < float32.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, float32[index]));
        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      pendingPcmRef.current.push(pcm);
      const queuedSamples = pendingPcmRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const flushSamples = Math.max(
        1,
        Math.min(
          DEFAULT_FLUSH_SAMPLES,
          Math.floor(maxChunkBytesRef.current / Int16Array.BYTES_PER_ELEMENT),
        ),
      );
      if (queuedSamples >= flushSamples) {
        flushPendingPcm();
      }
    },
    [flushPendingPcm],
  );

  const startMicrophone = useCallback(async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    await audioContext.audioWorklet.addModule("/audio/pcm-worklet.js");

    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-recorder-worklet");
    workletNode.port.onmessage = handleWorkletMessage;
    sourceNode.connect(workletNode);

    mediaStreamRef.current = mediaStream;
    audioContextRef.current = audioContext;
    sourceNodeRef.current = sourceNode;
    workletNodeRef.current = workletNode;
  }, [handleWorkletMessage]);

  const stop = useCallback(async () => {
    if (currentStateRef.current !== "recording" && currentStateRef.current !== "connecting") {
      return;
    }
    setConnectionState("stopping");
    isStoppingRef.current = true;
    stopReasonRef.current = "manual";
    flushPendingPcm();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "session.stop" }));
    } else {
      await reset();
    }
  }, [flushPendingPcm, reset]);

  const stopWithReason = useCallback(
    async (reason: StopReason = "manual") => {
      if (currentStateRef.current !== "recording" && currentStateRef.current !== "connecting") {
        return;
      }
      setConnectionState("stopping");
      isStoppingRef.current = true;
      stopReasonRef.current = reason;
      flushPendingPcm();
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "session.stop" }));
      } else {
        await reset();
      }
    },
    [flushPendingPcm, reset],
  );

  useEffect(() => {
    stopRef.current = stopWithReason;
  }, [stopWithReason]);

  const start = useCallback(async () => {
    if (connectionState !== "idle") {
      return;
    }

    setConnectionState("connecting");
    setError(null);
    setPartialText("");
    setFinalSegments([]);
    setCompletionReason(null);
    silenceStartedAtRef.current = null;
    speechDetectedRef.current = false;
    stopReasonRef.current = null;
    lastServerSeqRef.current = 0;
    maxChunkBytesRef.current = DEFAULT_MAX_CHUNK_BYTES;

    try {
      const sessionResponse = await fetch(apiRoutes.voiceSession, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_rate_hz: TARGET_SAMPLE_RATE }),
      });
      if (!sessionResponse.ok) {
        throw new Error(`Failed to create voice session (${sessionResponse.status})`);
      }

      const session = (await sessionResponse.json()) as { ws_url: string; max_chunk_bytes?: number };
      if (typeof session.max_chunk_bytes === "number" && session.max_chunk_bytes > 0) {
        maxChunkBytesRef.current = session.max_chunk_bytes;
      }
      const wsUrl = buildVoiceWsUrl(session.ws_url);
      const socket = new WebSocket(wsUrl, "voice.v1");
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "session.start",
            audio_format: "pcm_s16le",
            sample_rate_hz: TARGET_SAMPLE_RATE,
            channels: 1,
          }),
        );
      };

      socket.onmessage = async (event) => {
        const payload = JSON.parse(event.data) as ServerEvent;
        if (payload.type === "session.ready") {
          if (typeof payload.max_chunk_bytes === "number" && payload.max_chunk_bytes > 0) {
            maxChunkBytesRef.current = payload.max_chunk_bytes;
          }
          await startMicrophone();
          setConnectionState("recording");
          return;
        }

        if (payload.type === "transcript.partial") {
          if (payload.seq <= lastServerSeqRef.current) {
            return;
          }
          lastServerSeqRef.current = payload.seq;
          setPartialText(payload.text);
          return;
        }

        if (payload.type === "transcript.final") {
          if (payload.seq < lastServerSeqRef.current) {
            return;
          }
          lastServerSeqRef.current = payload.seq;
          setFinalSegments((current) => [
            ...current,
            { text: payload.text, startMs: payload.start_ms, endMs: payload.end_ms, seq: payload.seq },
          ]);
          setPartialText("");
          return;
        }

        if (payload.type === "error") {
          setError(payload.message);
          setConnectionState("error");
          await teardownAudio();
          return;
        }

        if (payload.type === "session.closed") {
          await teardownAudio();
          socket.close();
          socketRef.current = null;
          setCompletionReason(stopReasonRef.current);
          setConnectionState("idle");
          return;
        }
      };

      socket.onerror = () => {
        setError("Voice websocket connection failed.");
        setConnectionState("error");
      };

      socket.onclose = async () => {
        await teardownAudio();
        socketRef.current = null;
        if (isStoppingRef.current) {
          isStoppingRef.current = false;
          setCompletionReason(stopReasonRef.current);
          setConnectionState("idle");
          return;
        }
        setConnectionState((current) => (current === "idle" ? current : "error"));
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to start voice transcription.";
      setError(message);
      setConnectionState("error");
      await teardownAudio();
    }
  }, [connectionState, handleWorkletMessage, startMicrophone, teardownAudio]);

  useEffect(() => {
    return () => {
      void teardownAudio();
      socketRef.current?.close();
    };
  }, [teardownAudio]);

  return {
    connectionState,
    error,
    finalSegments,
    partialText,
    finalTranscript,
    liveTranscript,
    completionReason,
    start,
    stop: stopWithReason,
    reset,
  };
}
