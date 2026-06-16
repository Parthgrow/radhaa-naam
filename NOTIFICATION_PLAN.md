# Notification System Design Plan

## Overview
Build a notification center to show users notifications about friend request activity (received & accepted). Start simple and extensible for future notification types.

---

## 1. Data Model

### Notification Object
```typescript
interface Notification {
  id: string                    // UUID
  userId: string               // Who receives this notification
  type: "friend_request_received" | "friend_request_accepted"
  relatedEntityId: string      // Friend request ID or friend user ID
  relatedUserId: string        // Who sent the request / accepted request
  read: boolean
  createdAt: string           // ISO timestamp
  dismissedAt?: string        // When user dismissed it (optional)
}
```

### Notification Types:
- **friend_request_received**: Someone sent you a friend request
  - `relatedEntityId`: friendRequestId
  - `relatedUserId`: userId of person who sent the request
  
- **friend_request_accepted**: Someone accepted your friend request
  - `relatedEntityId`: friendRequestId
  - `relatedUserId`: userId of person who accepted

---

## 2. KV Storage Pattern

Using Vercel KV (Redis), we'll use these key patterns:

```
radha:notification:{notificationId}
  → Stores the complete notification object as JSON

radha:notifications:user:{userId}
  → Set of all notification IDs for a user (ordered by creation)

radha:notifications:user:{userId}:unread
  → Set of unread notification IDs (for badge count)

radha:notifications:user:{userId}:read
  → Set of read notification IDs (optional, for archival)
```

### Why This Pattern?
- **Fast lookups**: Get specific notification by ID
- **Efficient filtering**: Quick unread count for badge
- **Scalability**: Set operations are O(1) even with thousands of notifications
- **No complex indexing**: Pure key-value operations

---

## 3. Backend Implementation

### New Functions in `lib/kv/notifications.ts` (NEW FILE)

```typescript
// Create notification
async function createNotification(
  userId: string,
  type: "friend_request_received" | "friend_request_accepted",
  relatedEntityId: string,
  relatedUserId: string
): Promise<Notification | null>

// Mark as read
async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean>

// Get all notifications for user
async function getUserNotifications(
  userId: string,
  limit?: number
): Promise<Notification[]>

// Get unread count
async function getUnreadCount(userId: string): Promise<number>

// Delete/dismiss notification
async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<boolean>
```

### Trigger Points (in existing friend functions)

**When friend request is sent** (`sendFriendRequest()`):
```typescript
// Create "friend_request_received" notification for recipient
await createNotification(
  toUserId,
  "friend_request_received",
  requestId,
  fromUserId
)
```

**When friend request is accepted** (`acceptFriendRequest()`):
```typescript
// Create "friend_request_accepted" notification for sender
await createNotification(
  fromUserId,
  "friend_request_accepted",
  requestId,
  toUserId
)
```

---

## 4. API Endpoints

### `GET /api/notifications`
Returns all notifications for the current user
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "friend_request_received",
      "relatedUserId": "...",
      "relatedUserName": "John Doe",
      "read": false,
      "createdAt": "2026-06-16T10:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

### `PUT /api/notifications/{notificationId}/read`
Mark a notification as read
```json
{ "read": true }
```

### `DELETE /api/notifications/{notificationId}`
Dismiss/delete a notification

---

## 5. UI Implementation

### Components to Add

1. **NotificationBell** (in TopBar)
   - Shows unread count badge
   - Opens notification drawer on click
   - Real-time badge updates

2. **NotificationCenter** (modal/drawer)
   - List of notifications with timestamps
   - Click to view related content (e.g., open FriendsSheet and show the specific request)
   - "Mark as read" action
   - "Dismiss" button per notification
   - Visual distinction for unread vs read

### Example UI Layout
```
🔔 (3)  [Unread badge]
  ↓
[Notification Drawer]
┌─────────────────────────────────┐
│ John Doe sent you a friend      │ ← unread, click to act
│ request • 2 hours ago           │
├─────────────────────────────────┤
│ Jane Smith accepted your        │ ← read (grayed out)
│ friend request • 1 day ago      │
├─────────────────────────────────┤
│ Mike invited you • 3 days ago   │ ← old notification
└─────────────────────────────────┘
```

---

## 6. Data Flow Diagram

```
User A sends friend request to User B
    ↓
sendFriendRequest() in friends.ts
    ↓
Creates friend request record
    ↓
createNotification(
  userId: User B,
  type: "friend_request_received",
  relatedUserId: User A
)
    ↓
User B sees notification bell (unread count = 1)
User B clicks bell → sees "User A sent you a friend request"
    ↓
User B clicks notification → Opens FriendsSheet with Friend A highlighted
    ↓
User B accepts request
    ↓
acceptFriendRequest()
    ↓
Creates notification for User A: "friend_request_accepted"
    ↓
User A sees notification bell updates
```

---

## 7. Implementation Steps

1. **Create notifications KV functions** (`lib/kv/notifications.ts`)
   - All CRUD operations
   - Query helpers

2. **Update friend functions** (in `lib/kv/friends.ts`)
   - Call `createNotification()` after `sendFriendRequest()`
   - Call `createNotification()` after `acceptFriendRequest()`

3. **Create API endpoints**
   - GET /api/notifications
   - PUT /api/notifications/{id}/read
   - DELETE /api/notifications/{id}

4. **Update TopBar component**
   - Add notification bell with badge
   - Click handler to open notification drawer

5. **Create NotificationCenter component**
   - Display notifications
   - Mark as read
   - Dismiss actions

6. **Update FriendsSheet**
   - Optional: Highlight the specific request if opened from notification

---

## 8. Future Extensions (Not Now)

- Email digest: "You have 3 pending friend requests"
- Push notifications via service worker
- Notification preferences (mute certain types)
- Notification history/archive
- Read receipts on notifications
- Notification scheduling (batch daily digest)

---

## 9. Database Cleanup Strategy

For now, keep all notifications. Future options:
- Auto-archive read notifications after 30 days (add `archivedAt` field)
- Hard delete dismissed notifications after 7 days
- Use Redis TTL for automatic expiration

---

## Summary

| Aspect | Decision |
|--------|----------|
| Storage | Vercel KV with set-based indexing |
| Notification Types | friend_request_received, friend_request_accepted |
| UI | Notification bell in TopBar + drawer/modal |
| Retention | Keep indefinitely for now |
| Scalability | O(1) operations, supports thousands of notifications |
| Future-proof | Easy to add new notification types |
