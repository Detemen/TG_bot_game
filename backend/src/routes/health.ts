import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
