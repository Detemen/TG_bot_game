import crypto from "node:crypto";

interface SessionRecord {
  token: string;
  userAddress: string;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 година
const sessions = new Map<string, SessionRecord>();

export function createSession(userAddress: string): SessionRecord {
  const issuedAt = Date.now();
  const token = crypto.randomBytes(32).toString("base64url");
  const record: SessionRecord = {
    token,
    userAddress,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_MS,
  };
  sessions.set(token, record);
  return record;
}

export function validateSession(token: string): SessionRecord | null {
  const record = sessions.get(token);
  if (!record) {
    return null;
  }
  if (record.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return record;
}

export function revokeSession(token: string): void {
  sessions.delete(token);
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, record] of sessions) {
    if (record.expiresAt < now) {
      sessions.delete(token);
    }
  }
}
