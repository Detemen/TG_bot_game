import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { env } from "./env.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerDevRoutes } from "./routes/dev.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerLobbyWsRoutes } from "./routes/ws-lobby.js";
import { trackRoutes } from "./routes/track.js";
import { registerUserRoutes } from "./routes/user.js";
import { registerGameRoutes } from "./routes/game.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // CORS: origin:true for dev/ngrok/cloudflared. In production restrict to FRONTEND_URL.
  app.register(cors, {
    origin: true,
  });
  app.register(websocket);
  app.register(registerHealthRoutes, { prefix: "/health" });
  app.register(registerAuthRoutes, { prefix: "/auth" });
  // Dev routes only in development
  if (env.NODE_ENV === "development") {
    app.register(registerDevRoutes, { prefix: "/dev" });
  }
  app.register(registerLobbyWsRoutes, { prefix: "/ws/lobby" });
  app.register(trackRoutes);
  app.register(registerUserRoutes, { prefix: "/users" });
  app.register(registerGameRoutes, { prefix: "/games" });

  return app;
}
