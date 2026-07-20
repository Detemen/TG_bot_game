import { API_ROUTES, STORAGE_KEYS } from "../config";
import { TrackLayout } from "../types/track";

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorBody.error ?? `Request failed with status ${response.status}`,
      };
    }

    const json = (await response.json()) as T;
    return { data: json, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

export async function requestNonce(addressHint?: string) {
  return request<{ requestId: string; nonce: string; expiresAt: string }>(API_ROUTES.authRequest, {
    method: "POST",
    body: JSON.stringify(
      addressHint
        ? {
            addressHint,
          }
        : {},
    ),
  });
}

export async function verifySignature(payload: { requestId: string; address: string; signature: string }) {
  return request<{ token: string; expiresAt: string; address: string }>(API_ROUTES.authVerify, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchLobby() {
  const token = localStorage.getItem(STORAGE_KEYS.authToken) ?? undefined;
  return request<{
    lobbyId: string;
    status: string;
    requiredBalls: number;
    collectedBalls: number;
    participants: Array<{ address: string; balls: number }>;
    commitHash: string | null;
    seedPreview: string | null;
    nextRevealEta: number | null;
    track: TrackLayout;
    note?: string;
  }>(API_ROUTES.lobbyStub, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function devRequestNewTrack() {
  const token = localStorage.getItem(STORAGE_KEYS.authToken) ?? undefined;
  return request<{ state: unknown }>(API_ROUTES.lobbyMockProgress, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
