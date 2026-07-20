import crypto from "node:crypto";

export interface NonceRequest {
  id: string;
  nonce: string;
  expiresAt: number;
  createdAt: number;
  addressHint?: string;
  used: boolean;
}

const NONCE_TTL_MS = 2 * 60 * 1000; // 2 хвилини
const nonces = new Map<string, NonceRequest>();

export function createNonce(addressHint?: string): NonceRequest {
  const id = crypto.randomUUID();
  const nonce = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const record: NonceRequest = {
    id,
    nonce,
    createdAt: now,
    expiresAt: now + NONCE_TTL_MS,
    used: false,
    addressHint,
  };
  nonces.set(id, record);
  return record;
}

export function consumeNonce(id: string): NonceRequest | null {
  const record = nonces.get(id);
  if (!record) {
    return null;
  }
  const now = Date.now();
  if (record.used || record.expiresAt < now) {
    nonces.delete(id);
    return null;
  }
  record.used = true;
  nonces.set(id, record);
  return record;
}

export function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [id, record] of nonces) {
    if (record.expiresAt < now || record.used) {
      nonces.delete(id);
    }
  }
}
