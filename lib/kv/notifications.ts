import { v4 as uuid } from "uuid";
import { kv } from "./client";
import type { Notification } from "./types";

const PROJECT_PREFIX = "radha";

function getNotificationKey(notificationId: string): string {
  return `${PROJECT_PREFIX}:notification:${notificationId}`;
}

function getUserNotificationsKey(userId: string): string {
  return `${PROJECT_PREFIX}:notifications:user:${userId}`;
}

function getUserUnreadNotificationsKey(userId: string): string {
  return `${PROJECT_PREFIX}:notifications:user:${userId}:unread`;
}

export async function createNotification(
  userId: string,
  type: "friend_request_received" | "friend_request_accepted",
  relatedEntityId: string,
  relatedUserId: string
): Promise<Notification | null> {
  try {
    const notificationId = uuid();
    const now = new Date().toISOString();
    const notification: Notification = {
      id: notificationId,
      userId,
      type,
      relatedEntityId,
      relatedUserId,
      read: false,
      createdAt: now,
    };

    await kv.set(getNotificationKey(notificationId), notification);
    await kv.sadd(getUserNotificationsKey(userId), notificationId);
    await kv.sadd(getUserUnreadNotificationsKey(userId), notificationId);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getUserNotifications(
  userId: string
): Promise<Notification[]> {
  try {
    const notificationIds = await kv.smembers<string[]>(
      getUserNotificationsKey(userId)
    );
    const notifications: Notification[] = [];

    for (const notifId of notificationIds) {
      const notif = await kv.get<Notification>(getNotificationKey(notifId));
      if (notif && !notif.dismissedAt) {
        notifications.push(notif);
      }
    }

    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return notifications;
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const notif = await kv.get<Notification>(getNotificationKey(notificationId));
    if (!notif || notif.userId !== userId) return false;

    const updated: Notification = { ...notif, read: true };
    await kv.set(getNotificationKey(notificationId), updated);
    await kv.srem(getUserUnreadNotificationsKey(userId), notificationId);

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

export async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const notif = await kv.get<Notification>(getNotificationKey(notificationId));
    if (!notif || notif.userId !== userId) return false;

    const now = new Date().toISOString();
    const updated: Notification = { ...notif, dismissedAt: now };
    await kv.set(getNotificationKey(notificationId), updated);
    await kv.srem(getUserUnreadNotificationsKey(userId), notificationId);
    await kv.srem(getUserNotificationsKey(userId), notificationId);

    return true;
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return false;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const unreadIds = await kv.smembers<string[]>(
      getUserUnreadNotificationsKey(userId)
    );
    return unreadIds.length;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}
