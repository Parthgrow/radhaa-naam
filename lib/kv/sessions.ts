import { kv } from "./client";
import { Session } from "./types";

const PROJECT_PREFIX = "radha";
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

function getSessionKey(sessionToken: string) {
  return `${PROJECT_PREFIX}:session:${sessionToken}`;
}

export async function saveSession(
  sessionToken: string,
  userId: string,
  expiresAt: Date
): Promise<Session> {
  const session: Session = {
    sessionToken,
    userId,
    expires: expiresAt.toISOString(),
  };

  try {
    await kv.set(getSessionKey(sessionToken), JSON.stringify(session), {
      ex: SESSION_TTL,
    });
    return session;
  } catch (error) {
    console.error("Error saving session:", error);
    throw error;
  }
}

export async function getSession(
  sessionToken: string
): Promise<Session | null> {
  try {
    const sessionData = await kv.get<string>(getSessionKey(sessionToken));
    if (!sessionData) return null;
    return JSON.parse(sessionData) as Session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    await kv.del(getSessionKey(sessionToken));
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

export async function updateSessionExpiry(
  sessionToken: string,
  newExpiresAt: Date
): Promise<Session | null> {
  try {
    const session = await getSession(sessionToken);
    if (!session) return null;

    const updated: Session = {
      ...session,
      expires: newExpiresAt.toISOString(),
    };

    await kv.set(getSessionKey(sessionToken), JSON.stringify(updated), {
      ex: SESSION_TTL,
    });
    return updated;
  } catch (error) {
    console.error("Error updating session expiry:", error);
    return null;
  }
}
