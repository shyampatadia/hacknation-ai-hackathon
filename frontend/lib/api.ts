export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:8000";

export function buildVoiceWsUrl(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  if (url.startsWith("ws://") || url.startsWith("wss://")) {
    return url;
  }

  const origin = new URL(apiBaseUrl, window.location.origin);
  const protocol = origin.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${origin.host}${url.startsWith("/") ? url : `/${url}`}`;
}

export const apiRoutes = {
  crisisQuery: `${apiBaseUrl}/api/query/crisis`,
  mapDeserts: `${apiBaseUrl}/api/map/deserts`,
  facilities: `${apiBaseUrl}/api/facilities`,
  voiceSession: `${apiBaseUrl}/api/voice/session`,
  voiceTranscribe: `${apiBaseUrl}/ws/voice/transcribe`,
};
