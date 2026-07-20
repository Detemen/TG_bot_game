import { create } from "zustand";

import { devRequestNewTrack, fetchLobby } from "../api/client";
import { TrackLayout } from "../types/track";

export interface LobbyData {
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
}

interface LobbyState {
  data: LobbyData | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  requestNewTrack: () => Promise<void>;
  setData: (data: LobbyData) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  data: null,
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null });
    const { data, error } = await fetchLobby();
    if (error || !data) {
      set({ loading: false, error: error ?? "Не вдалося завантажити лобі." });
      return;
    }
    set({ data, loading: false, error: null });
  },
  requestNewTrack: async () => {
    set({ loading: true, error: null });
    await devRequestNewTrack();
    const { data, error } = await fetchLobby();
    if (error || !data) {
      set({ loading: false, error: error ?? "Не вдалося оновити лобі." });
      return;
    }
    set({ data, loading: false, error: null });
  },
  setData: (data) => set({ data, loading: false, error: null }),
}));
