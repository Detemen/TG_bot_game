import { create } from "zustand";

import { STORAGE_KEYS } from "../config";
import { requestNonce, verifySignature } from "../api/client";

export type AuthStatus = "idle" | "requesting" | "nonce_ready" | "verifying" | "authenticated" | "error";

interface AuthState {
  address: string | null;
  token: string | null;
  status: AuthStatus;
  requestId: string | null;
  nonce: string | null;
  error: string | null;
  expiresAt: string | null;
  initFromStorage: () => void;
  startNonceRequest: (addressHint?: string) => Promise<void>;
  completeVerification: (address: string, signature?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  address: null,
  token: null,
  status: "idle",
  requestId: null,
  nonce: null,
  error: null,
  expiresAt: null,
  initFromStorage: () => {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const address = localStorage.getItem(STORAGE_KEYS.authAddress);
    if (token && address) {
      set({ token, address, status: "authenticated", requestId: null, nonce: null, error: null });
    }
  },
  startNonceRequest: async (addressHint) => {
    set({ status: "requesting", error: null });
    const { data, error } = await requestNonce(addressHint);
    if (error || !data) {
      set({ status: "error", error: error ?? "Не вдалося отримати nonce" });
      return;
    }
    set({
      status: "nonce_ready",
      requestId: data.requestId,
      nonce: data.nonce,
      error: null,
    });
  },
  completeVerification: async (address, signatureArg) => {
    const { requestId, nonce } = get();
    if (!requestId || !nonce) {
      set({ status: "error", error: "Спочатку запросіть nonce." });
      return;
    }

    const signature = signatureArg ?? nonce; // dev placeholder
    set({ status: "verifying", error: null });
    const { data, error } = await verifySignature({ requestId, address, signature });
    if (error || !data) {
      set({ status: "error", error: error ?? "Не вдалося підтвердити підпис." });
      return;
    }

    localStorage.setItem(STORAGE_KEYS.authToken, data.token);
    localStorage.setItem(STORAGE_KEYS.authAddress, data.address);

    set({
      status: "authenticated",
      token: data.token,
      address: data.address,
      expiresAt: data.expiresAt,
      requestId: null,
      nonce: null,
    });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    localStorage.removeItem(STORAGE_KEYS.authAddress);
    set({
      address: null,
      token: null,
      status: "idle",
      requestId: null,
      nonce: null,
      error: null,
      expiresAt: null,
    });
  },
}));
