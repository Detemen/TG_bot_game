import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { cleanupExpiredNonces, consumeNonce, createNonce } from "../services/nonce-store.js";
import { createSession } from "../services/session-store.js";

const requestSchema = z.object({
  addressHint: z.string().min(1).max(128).optional(),
});

const verifySchema = z.object({
  requestId: z.string().uuid(),
  address: z.string().min(3).max(128),
  signature: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/request", async (request, reply) => {
    const payload = requestSchema.safeParse(request.body ?? {});
    if (!payload.success) {
      return reply.status(400).send({ error: "Invalid body", issues: payload.error.issues });
    }

    cleanupExpiredNonces();
    const nonceRecord = createNonce(payload.data.addressHint);
    return reply.send({
      requestId: nonceRecord.id,
      nonce: nonceRecord.nonce,
      expiresAt: new Date(nonceRecord.expiresAt).toISOString(),
    });
  });

  app.post("/verify", async (request, reply) => {
    const payload = verifySchema.safeParse(request.body ?? {});
    if (!payload.success) {
      return reply.status(400).send({ error: "Invalid body", issues: payload.error.issues });
    }

    cleanupExpiredNonces();
    const record = consumeNonce(payload.data.requestId);
    if (!record) {
      return reply.status(400).send({ error: "Nonce not found or expired" });
    }

    // TODO: замінити на перевірку підпису TON.
    if (payload.data.signature !== record.nonce) {
      return reply.status(401).send({
        error: "Signature verification failed (placeholder check)",
        hint: "Для dev-режиму підпис має збігатися з nonce.",
      });
    }

    const session = createSession(payload.data.address);
    return reply.send({
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      address: session.userAddress,
    });
  });
}
