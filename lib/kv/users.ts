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

    const userData = await kv.get<string>(getUserKey(userId));
    if (!userData) return null;

    return JSON.parse(userData) as User;
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
    createdAt: now,
    updatedAt: now,
  };

  try {
    await kv.set(getUserKey(userId), JSON.stringify(userData));
    await kv.set(getEmailIndexKey(email), userId);
    return userData;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userData = await kv.get<string>(getUserKey(userId));
    if (!userData) return null;
    return JSON.parse(userData) as User;
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

    await kv.set(getUserKey(userId), JSON.stringify(updated));
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
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}
