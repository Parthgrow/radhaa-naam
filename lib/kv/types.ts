export interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  allowRecommendations: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Raw, persisted subscription/trial state for a user. */
export interface SubscriptionRecord {
  // Lifecycle status as stored. `cancelled` means "cancelled but may still be
  // within the paid period" — getAccessState resolves that to active/expired.
  status: "trialing" | "active" | "past_due" | "expired" | "cancelled";
  trialEndsAt: string | null; // ISO — set at signup
  currentPeriodEnd: string | null; // ISO — Dodo next_billing_date
  cancelAtPeriodEnd: boolean;
  subscriptionId: string | null;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySync {
  userId: string;
  weekStart: string;
  totalBeads: number;
  totalMalas: number;
  syncedAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted";
  createdAt: string;
}

export interface Session {
  sessionToken: string;
  userId: string;
  expires: string;
}

export interface JWTPayload {
  userId?: string;
  iat?: number;
  exp?: number;
}

export interface DailyJaap {
  userId: string;
  date: string;          // YYYY-MM-DD
  beads: number;
  malas: number;
  lastSyncedAt: string;  // ISO timestamp for conflict resolution
}

export interface UserSettings {
  userId: string;
  naam: string;
  transliteration: string;
  beadsPerMala: number;
  malaGoal: number;
  haptics: boolean;
  sound: boolean;
  theme: "lotus" | "dark" | "auto";
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "friend_request_received" | "friend_request_accepted";
  relatedEntityId: string;
  relatedUserId: string;
  read: boolean;
  createdAt: string;
  dismissedAt?: string;
}
