import type { FastifyInstance } from "fastify";

const CURRENT_BLUEPRINT_LINK =
  "docs/backend_blueprint.md"; // used in responses for quick reference during development

import { generateSeedAndCommit, getLobbyState, resetLobbyState, updateLobbyState } from "../state/lobby-state.js";

export async function registerDevRoutes(app: FastifyInstance) {
  app.get("/blueprint", async () => {
    return {
      message: "Backend blueprint reference",
      path: CURRENT_BLUEPRINT_LINK,
    };
  });

  app.get("/lobby/stub", async () => {
    return {
      ...getLobbyState(),
      blueprint: CURRENT_BLUEPRINT_LINK,
      note: "Replace with real data once persistence layer is added.",
    };
  });

  app.post("/lobby/reset", async () => {
    const state = resetLobbyState();
    return { state, message: "Lobby state reset." };
  });

  app.post("/lobby/mock-progress", async () => {
    const current = getLobbyState();
    const { seed, commit, track } = generateSeedAndCommit();

    const updated = updateLobbyState({
      commitHash: commit,
      seedPreview: seed,
      nextRevealEta: Date.now() + 20_000,
      track,
      status: "collecting",
      collectedBalls: current.collectedBalls,
    });

    return { state: updated, message: "New track generated (dev)." };
  });
}
