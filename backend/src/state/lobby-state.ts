import crypto from "node:crypto";

import { generateTrackLayout } from "../services/track-generator.js";
import type { TrackLayout } from "../types/track.js";

export type LobbyStatus = "collecting" | "commit" | "running" | "settled" | "cancelled";

export interface LobbyState {
  lobbyId: string;
  status: LobbyStatus;
  requiredBalls: number;
  collectedBalls: number;
  commitHash: string | null;
  seedPreview: string | null;
  nextRevealEta: number | null;
  participants: Array<{
    address: string;
    balls: number;
  }>;
  lastCommitBroadcast: number | null;
  track: TrackLayout;
  updatedAt: number;
}

function createCommitFromSeed(seed: string) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

export function generateSeedAndCommit(): { seed: string; commit: string; track: TrackLayout } {
  const seed = crypto.randomBytes(8).toString("hex");
  const commit = createCommitFromSeed(seed);
  const track = generateTrackLayout({
    seed,
    width: 420,
    height: 900,
    difficulty: "medium",
  });
  return { seed, commit, track };
}

function createInitialState(): LobbyState {
  const { seed, commit, track } = generateSeedAndCommit();
  return {
    lobbyId: "stub-lobby",
    status: "collecting",
    requiredBalls: 10,
    collectedBalls: 3,
    commitHash: commit,
    seedPreview: seed,
    nextRevealEta: Date.now() + 30_000,
    participants: [
      { address: "UQCR...abc", balls: 2 },
      { address: "UQDk...xyz", balls: 1 },
    ],
    lastCommitBroadcast: null,
    track,
    updatedAt: Date.now(),
  };
}

let state: LobbyState = createInitialState();

export function getLobbyState(): LobbyState {
  return state;
}

export function setLobbyState(next: LobbyState): LobbyState {
  state = { ...next, updatedAt: Date.now() };
  return state;
}

export function updateLobbyState(partial: Partial<LobbyState>): LobbyState {
  state = { ...state, ...partial, updatedAt: Date.now() };
  return state;
}

export function resetLobbyState(): LobbyState {
  state = createInitialState();
  return state;
}
