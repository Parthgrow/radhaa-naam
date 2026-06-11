import { v4 as uuid } from "uuid";
import { kv } from "./client";
import type { FriendRequest, User } from "./types";
import { getUser } from "./users";

const PROJECT_PREFIX = "radha";

function getFriendRequestKey(requestId: string): string {
  return `${PROJECT_PREFIX}:friendreq:${requestId}`;
}

function getFriendsKey(userId: string): string {
  return `${PROJECT_PREFIX}:friends:${userId}`;
}

function getPendingIncomingKey(userId: string): string {
  return `${PROJECT_PREFIX}:pending:incoming:${userId}`;
}

function getPendingOutgoingKey(userId: string): string {
  return `${PROJECT_PREFIX}:pending:outgoing:${userId}`;
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest | null> {
  try {
    if (fromUserId === toUserId) return null;

    const toUser = await getUser(toUserId);
    if (!toUser) return null;

    const existing = await kv.sismember(getFriendsKey(fromUserId), toUserId);
    if (existing) return null;

    const outgoing = await kv.smembers<string>(getPendingOutgoingKey(fromUserId));
    for (const reqId of outgoing) {
      const req = await kv.get<string>(getFriendRequestKey(reqId));
      if (req) {
        const parsed = JSON.parse(req) as FriendRequest;
        if (parsed.toUserId === toUserId && parsed.status === "pending") {
          return null;
        }
      }
    }

    const requestId = uuid();
    const now = new Date().toISOString();
    const request: FriendRequest = {
      id: requestId,
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: now,
    };

    await kv.set(getFriendRequestKey(requestId), request);
    await kv.sadd(getPendingOutgoingKey(fromUserId), requestId);
    await kv.sadd(getPendingIncomingKey(toUserId), requestId);

    return request;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return null;
  }
}

export async function acceptFriendRequest(
  requestId: string,
  actingUserId: string
): Promise<boolean> {
  try {
    const reqData = await kv.get<FriendRequest>(getFriendRequestKey(requestId));
    if (!reqData) return false;

    const req = reqData;
    if (req.toUserId !== actingUserId || req.status !== "pending") return false;

    const updatedReq: FriendRequest = { ...req, status: "accepted" };

    await kv.set(getFriendRequestKey(requestId), updatedReq);
    await kv.sadd(getFriendsKey(req.fromUserId), req.toUserId);
    await kv.sadd(getFriendsKey(req.toUserId), req.fromUserId);
    await kv.srem(getPendingIncomingKey(actingUserId), requestId);
    await kv.srem(getPendingOutgoingKey(req.fromUserId), requestId);

    return true;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return false;
  }
}

export async function declineFriendRequest(
  requestId: string,
  actingUserId: string
): Promise<boolean> {
  try {
    const reqData = await kv.get<FriendRequest>(getFriendRequestKey(requestId));
    if (!reqData) return false;

    const req = reqData;
    if (req.toUserId !== actingUserId || req.status !== "pending") return false;

    await kv.del(getFriendRequestKey(requestId));
    await kv.srem(getPendingIncomingKey(actingUserId), requestId);
    await kv.srem(getPendingOutgoingKey(req.fromUserId), requestId);

    return true;
  } catch (error) {
    console.error("Error declining friend request:", error);
    return false;
  }
}

export async function getFriends(userId: string): Promise<User[]> {
  try {
    const friendIds = await kv.smembers<string>(getFriendsKey(userId));
    const friends: User[] = [];

    for (const friendId of friendIds) {
      const user = await getUser(friendId);
      if (user) friends.push(user);
    }

    return friends;
  } catch (error) {
    console.error("Error getting friends:", error);
    return [];
  }
}

export async function getPendingRequests(
  userId: string
): Promise<Array<{ request: FriendRequest; from: User }>> {
  try {
    const requestIds = await kv.smembers<string>(getPendingIncomingKey(userId));
    const pending: Array<{ request: FriendRequest; from: User }> = [];

    for (const reqId of requestIds) {
      const reqData = await kv.get<FriendRequest>(getFriendRequestKey(reqId));
      if (reqData) {
        const req = reqData;
        const from = await getUser(req.fromUserId);
        if (from) {
          pending.push({ request: req, from });
        }
      }
    }

    return pending;
  } catch (error) {
    console.error("Error getting pending requests:", error);
    return [];
  }
}

export async function getRandomRecommendations(
  userId: string,
  count: number = 4
): Promise<User[]> {
  try {
    const allUserIds = await kv.smembers<string>(`${PROJECT_PREFIX}:users:all`);
    const friendIds = await kv.smembers<string>(getFriendsKey(userId));
    const friendSet = new Set(friendIds);

    const outgoing = await kv.smembers<string>(getPendingOutgoingKey(userId));
    const incoming = await kv.smembers<string>(getPendingIncomingKey(userId));
    const pendingRequestIds = new Set([...outgoing, ...incoming]);

    const pendingUserIds = new Set<string>();
    for (const reqId of pendingRequestIds) {
      const reqData = await kv.get<FriendRequest>(getFriendRequestKey(reqId));
      if (reqData) {
        const req = reqData;
        pendingUserIds.add(req.fromUserId);
        pendingUserIds.add(req.toUserId);
      }
    }

    const candidates = allUserIds.filter(
      (id) =>
        id !== userId &&
        !friendSet.has(id) &&
        !pendingUserIds.has(id)
    );

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const recommendations: User[] = [];
    for (const userId of selected) {
      const user = await getUser(userId);
      if (user && user.allowRecommendations) {
        recommendations.push(user);
      }
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting random recommendations:", error);
    return [];
  }
}
