import { apiBaseUrl } from "@/lib/api";

type RequestOptions = {
  method?: "GET" | "POST";
  accessToken: string;
  body?: unknown;
};

type AuthUserResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    last_sign_in_at: string | null;
  };
};

export type UserProfileResponse = {
  profile: {
    id: string;
    email: string;
    role: string;
    full_name: string | null;
    organization: string | null;
    district: string | null;
    state: string | null;
    language: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

type BootstrapProfilePayload = {
  role: string;
  full_name?: string;
  organization?: string;
  district?: string;
  state?: string;
  language?: string;
};

type BootstrapProfileResponse = {
  profile: NonNullable<UserProfileResponse["profile"]>;
};

async function authedRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const fallback = "Request failed.";

    try {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail ?? fallback);
    } catch (error) {
      if (error instanceof Error && error.message !== fallback) {
        throw error;
      }

      throw new Error(fallback);
    }
  }

  return (await response.json()) as T;
}

export function fetchCurrentUser(accessToken: string) {
  return authedRequest<AuthUserResponse>("/api/auth/me", { accessToken });
}

export function fetchCurrentProfile(accessToken: string) {
  return authedRequest<UserProfileResponse>("/api/auth/profile", { accessToken });
}

export function bootstrapUserProfile(accessToken: string, body: BootstrapProfilePayload) {
  return authedRequest<BootstrapProfileResponse>("/api/auth/profile", {
    method: "POST",
    accessToken,
    body,
  });
}

