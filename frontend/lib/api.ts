export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:8000";

export const apiRoutes = {
  crisisQuery: `${apiBaseUrl}/api/query/crisis`,
  mapDeserts: `${apiBaseUrl}/api/map/deserts`,
  facilities: `${apiBaseUrl}/api/facilities`,
  voiceTranscribe: `${apiBaseUrl}/api/voice/transcribe`,
};

