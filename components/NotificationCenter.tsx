"use client";

import { useState, useEffect } from "react";
import Sheet from "./Sheet";
import type { Notification } from "@/lib/kv/types";

interface NotificationWithUser extends Notification {
  relatedUserName: string;
}

type Props = { open: boolean; onClose: () => void };

export default function NotificationCenter({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });

      if (res.ok) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotifications(notifications.filter((n) => n.id !== notificationId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationText = (notif: NotificationWithUser): string => {
    if (notif.type === "friend_request_received") {
      return `${notif.relatedUserName} sent you a friend request`;
    } else if (notif.type === "friend_request_accepted") {
      return `${notif.relatedUserName} accepted your friend request`;
    }
    return "You have a new notification";
  };

  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return "a while ago";
  };

  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      <div className="space-y-2">
        {notifications.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted">No notifications yet</p>
          </div>
        )}

        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`rounded-lg border px-4 py-3 ${
              notif.read
                ? "bg-surface border-ring/20"
                : "bg-primary/5 border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={`text-sm ${notif.read ? "text-muted" : "text-foreground font-medium"}`}>
                  {getNotificationText(notif)}
                </p>
                <p className="text-xs text-muted mt-1">{getTimeAgo(notif.createdAt)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-xs rounded px-2 py-1 bg-primary text-white hover:bg-primary/90"
                  >
                    Read
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(notif.id)}
                  className="text-xs rounded px-2 py-1 bg-muted text-foreground hover:bg-muted/80"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
