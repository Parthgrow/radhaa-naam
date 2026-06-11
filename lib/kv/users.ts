import { kv } from "./client";
import { User } from "./types";

const PROJECT_PREFIX = "radha";

function getUserKey(userId: string) {
  return `${PROJECT_PREFIX}:user:${userId}`;
}

function getEmailIndexKey(email: string) {
  return `${PROJECT_PREFIX}:email:${email}`;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const userId = await kv.get<string>(getEmailIndexKey(email));
    if (!userId) return null;

    const userData = await kv.get<User>(getUserKey(userId));
    if (!userData) return null;

    return userData;
  } catch (error) {
    console.error("Error finding user by email:", error);
    return null;
  }
}

export async function createUser(
  userId: string,
  name: string | null,
  email: string
): Promise<User> {
  const now = new Date().toISOString();
  const userData: User = {
    id: userId,
    name,
    email,
    username: null,
    allowRecommendations: true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await kv.set(getUserKey(userId), userData);
    await kv.set(getEmailIndexKey(email), userId);
    await kv.sadd(`${PROJECT_PREFIX}:users:all`, userId);
    return userData;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userData = await kv.get<User>(getUserKey(userId));
    if (!userData) return null;
    return userData;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(getUserKey(userId), updated);
    return updated;
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const user = await getUser(userId);
    if (!user) return false;

    await kv.del(getUserKey(userId));
    await kv.del(getEmailIndexKey(user.email));
    if (user.username) {
      await kv.del(getUsernameKey(user.username));
    }
    await kv.srem(`${PROJECT_PREFIX}:users:all`, userId);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

function getUsernameKey(username: string): string {
  return `${PROJECT_PREFIX}:username:${username.toLowerCase()}`;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const userId = await kv.get<string>(getUsernameKey(username.toLowerCase()));
    if (!userId) return null;

    const userData = await kv.get<User>(getUserKey(userId));
    if (!userData) return null;

    return userData;
  } catch (error) {
    console.error("Error finding user by username:", error);
    return null;
  }
}

export async function setUsername(
  userId: string,
  username: string
): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const lowerUsername = username.toLowerCase();
    const existing = await kv.get<string>(getUsernameKey(lowerUsername));
    if (existing && existing !== userId) {
      return null;
    }

    if (user.username) {
      await kv.del(getUsernameKey(user.username));
    }

    const updated: User = { ...user, username: lowerUsername, updatedAt: new Date().toISOString() };
    await kv.set(getUsernameKey(lowerUsername), userId);
    await kv.set(getUserKey(userId), updated);

    return updated;
  } catch (error) {
    console.error("Error setting username:", error);
    return null;
  }
}
