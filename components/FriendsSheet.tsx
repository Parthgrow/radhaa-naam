"use client";

import { useState, useEffect } from "react";
import Sheet from "./Sheet";
import type { User, FriendRequest } from "@/lib/kv/types";

type Props = { open: boolean; onClose: () => void };

interface FriendWithBeads {
  user: User;
  weeklyBeads: number | null;
}

export default function FriendsSheet({ open, onClose }: Props) {
  const [friends, setFriends] = useState<FriendWithBeads[]>([]);
  const [pending, setPending] = useState<Array<{ request: FriendRequest; from: User }>>([]);
  const [pendingSent, setPendingSent] = useState<Array<{ request: FriendRequest; to: User }>>([]);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [myWeeklyBeads, setMyWeeklyBeads] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, pendingRes, pendingSentRes, recsRes] = await Promise.all([
        fetch("/api/friends/list"),
        fetch("/api/friends/pending"),
        fetch("/api/friends/pending-sent"),
        fetch("/api/friends/recommendations"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setFriends(data.friends || []);
        const myBeads = data.friends.reduce(
          (sum: number, f: FriendWithBeads) =>
            Math.max(sum, f.weeklyBeads !== null ? f.weeklyBeads : 0),
          0
        );
        const myData = await fetch("/api/user/profile");
        if (myData.ok) {
          const user = await myData.json();
        }
        await resyncBeads();
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPending(data.pending || []);
      }

      if (pendingSentRes.ok) {
        const data = await pendingSentRes.json();
        setPendingSent(data.pendingSent || []);
      }

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resyncBeads = async () => {
    const listRes = await fetch("/api/friends/list");
    if (listRes.ok) {
      const data = await listRes.json();
      const myBeads = data.friends.reduce(
        (sum: number, f: FriendWithBeads) =>
          Math.max(sum, f.weeklyBeads !== null ? f.weeklyBeads : 0),
        0
      );
      setMyWeeklyBeads(myBeads);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: searchInput }),
      });

      if (res.ok) {
        setSearchInput("");
        await loadData();
      } else {
        const error = await res.json();
        setSearchError(error.error || "Failed to send request");
      }
    } catch (e) {
      setSearchError("Error sending request");
    }
  };

  const handleRespond = async (
    requestId: string,
    action: "accept" | "decline"
  ) => {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecommendation = async (userId: string) => {
    try {
      const user = recommendations.find((u) => u.id === userId);
      if (!user) return;

      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: user.email }),
      });

      if (res.ok) {
        setRecommendations(recommendations.filter((u) => u.id !== userId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const friendsWithBeads = friends.filter((f) => f.weeklyBeads && f.weeklyBeads > 0).length;

  return (
    <Sheet open={open} onClose={onClose} title="Saangh">
      <div className="space-y-6">
        <Section>
          <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-3">
            <p className="text-sm text-foreground">
              You and {friendsWithBeads} {friendsWithBeads === 1 ? "friend" : "friends"} are doing naam jaap this week ✨
            </p>
          </div>
        </Section>

        <Section title="This Week">
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-primary">{myWeeklyBeads}</div>
            <div className="text-xs text-muted mt-1">beads</div>
          </div>
        </Section>

        {friends.length > 0 && (
          <Section title="Friends">
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.user.id} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 ring-1 ring-ring/40">
                  <div>
                    <div className="text-sm font-medium text-foreground">{f.user.name || f.user.username || f.user.email}</div>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {f.weeklyBeads !== null ? f.weeklyBeads : "—"} beads
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {pending.length > 0 && (
          <Section title="Pending Requests">
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.request.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 ring-1 ring-ring/40"
                >
                  <div className="text-sm text-foreground">
                    {p.from.name || p.from.username || p.from.email}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(p.request.id, "accept")}
                      className="text-xs rounded-lg bg-primary px-2 py-1 text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(p.request.id, "decline")}
                      className="text-xs rounded-lg bg-muted px-2 py-1 text-foreground"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {pendingSent.length > 0 && (
          <Section title="Requests Sent">
            <div className="space-y-2">
              {pendingSent.map((p) => (
                <div
                  key={p.request.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 ring-1 ring-ring/40"
                >
                  <div>
                    <div className="text-sm text-foreground">
                      {p.to.name || p.to.username || p.to.email}
                    </div>
                    <div className="text-xs text-muted mt-1">Pending</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Add Friend">
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="text"
              placeholder="Email or username"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!searchInput}
              className="rounded-lg bg-primary px-3 py-2 text-white disabled:bg-muted"
            >
              Send
            </button>
          </form>
          {searchError && (
            <div className="mt-2 text-xs text-red-600">{searchError}</div>
          )}
        </Section>

        {recommendations.length > 0 && (
          <Section title="Discover">
            <div className="space-y-2">
              {recommendations.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 ring-1 ring-ring/40"
                >
                  <div className="text-sm text-foreground">
                    {user.name || user.username || user.email}
                  </div>
                  <button
                    onClick={() => handleAddRecommendation(user.id)}
                    className="text-xs rounded-lg bg-primary px-2 py-1 text-white"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {friends.length === 0 && pending.length === 0 && pendingSent.length === 0 && recommendations.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted">
              Start by adding a friend or discovering new people!
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  if (!title) {
    return <>{children}</>;
  }

  return (
    <section>
      <h3 className="text-xs uppercase tracking-[0.25em] text-muted mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
