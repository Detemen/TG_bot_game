import { getLobbyState } from "../state/lobby-state.js";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";

interface LobbyEventEnvelope {
  type: string;
  payload: unknown;
}

function serialize(event: LobbyEventEnvelope): string {
  return JSON.stringify(event);
}

export async function registerLobbyWsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get(
    "/state",
    { websocket: true },
    (connection /* SocketStream */) => {
      let previousCommitHash: string | null = null;
      let previousSeedPreview: string | null = null;
      let previousStatus: string | null = null;

      const emit = (event: LobbyEventEnvelope) => {
        try {
          connection.socket.send(serialize(event));
        } catch (error) {
          app.log.warn({ err: error }, "Failed to send WS message");
        }
      };

      const pushSnapshot = () => {
        const state = getLobbyState();
        emit({ type: "lobby_state", payload: state });

        if (state.commitHash && state.commitHash !== previousCommitHash) {
          previousCommitHash = state.commitHash;
          emit({
            type: "commit_announced",
            payload: {
              commitHash: state.commitHash,
              nextRevealEta: state.nextRevealEta,
              track: state.track,
              message: "Dev placeholder: commit hash згенеровано локально.",
            },
          });
        }

        if (state.seedPreview && state.seedPreview !== previousSeedPreview) {
          previousSeedPreview = state.seedPreview;
          emit({
            type: "seed_preview",
            payload: {
              seed: state.seedPreview,
              track: state.track,
              message: "Dev placeholder: seed поки що не впливає на фізику.",
            },
          });
        }

        if (state.status !== previousStatus) {
          previousStatus = state.status;
          emit({
            type: "status_change",
            payload: {
              status: state.status,
              timestamp: Date.now(),
            },
          });
        }
      };

      pushSnapshot();
      const interval = setInterval(pushSnapshot, 5000);
      connection.socket.on("close", () => clearInterval(interval));
    },
  );
}
