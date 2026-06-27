#!/usr/bin/env node
/**
 * Delete a user and ALL related data from the KV database, by email.
 *
 * Usage:
 *   node scripts/delete-user.mjs <email>            # delete
 *   node scripts/delete-user.mjs <email> --dry-run  # show what would be deleted
 *
 * Cascades across: user record, email/username indexes, the all-users set,
 * subscription, daily jaap + settings + lifetime + history index, weekly syncs,
 * friends (both sides), pending friend requests (both sides), and notifications
 * (the user's own, plus any that reference the user).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PREFIX = "radha";
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- load .env so @vercel/kv picks up KV_REST_API_* before it's imported ---
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, key, val] = m;
      val = val.replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    console.warn("Could not read .env:", e.message);
  }
}
loadEnv();

const { kv } = await import("@vercel/kv");

// --- args ---
const email = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!email) {
  console.error("Usage: node scripts/delete-user.mjs <email> [--dry-run]");
  process.exit(1);
}

const toDelete = new Set(); // string keys to del
const setRemovals = []; // { key, member } srem operations

function planDel(key) {
  if (key) toDelete.add(key);
}
function planSrem(key, member) {
  if (key && member) setRemovals.push({ key, member });
}

async function main() {
  const userId = await kv.get(`${PREFIX}:email:${email}`);
  if (!userId) {
    console.error(`No user found for email: ${email}`);
    process.exit(1);
  }
  console.log(`Resolved ${email} -> userId ${userId}`);

  const user = await kv.get(`${PREFIX}:user:${userId}`);

  // 1. Core user keys
  planDel(`${PREFIX}:user:${userId}`);
  planDel(`${PREFIX}:email:${email}`);
  if (user?.username) planDel(`${PREFIX}:username:${user.username}`);
  planSrem(`${PREFIX}:users:all`, userId);

  // 2. Subscription (note: NOT under the radha prefix)
  planDel(`user:${userId}:subscription`);

  // 3. Daily jaap + settings + lifetime + history index
  const dates = (await kv.smembers(`${PREFIX}:history-index:${userId}`)) || [];
  for (const date of dates) planDel(`${PREFIX}:daily:${userId}:${date}`);
  planDel(`${PREFIX}:history-index:${userId}`);
  planDel(`${PREFIX}:settings:${userId}`);
  planDel(`${PREFIX}:lifetime:${userId}`);

  // 4. Weekly syncs (no index -> scan)
  for await (const key of scanMatch(`${PREFIX}:weeklysync:${userId}:*`)) {
    planDel(key);
  }

  // 5. Friends (remove self from each friend's set, then drop own set)
  const friends = (await kv.smembers(`${PREFIX}:friends:${userId}`)) || [];
  for (const friendId of friends) {
    planSrem(`${PREFIX}:friends:${friendId}`, userId);
  }
  planDel(`${PREFIX}:friends:${userId}`);

  // 6. Pending friend requests (clean up the counterparty side too)
  const outgoing =
    (await kv.smembers(`${PREFIX}:pending:outgoing:${userId}`)) || [];
  for (const reqId of outgoing) {
    const req = await kv.get(`${PREFIX}:friendreq:${reqId}`);
    if (req?.toUserId)
      planSrem(`${PREFIX}:pending:incoming:${req.toUserId}`, reqId);
    planDel(`${PREFIX}:friendreq:${reqId}`);
  }
  planDel(`${PREFIX}:pending:outgoing:${userId}`);

  const incoming =
    (await kv.smembers(`${PREFIX}:pending:incoming:${userId}`)) || [];
  for (const reqId of incoming) {
    const req = await kv.get(`${PREFIX}:friendreq:${reqId}`);
    if (req?.fromUserId)
      planSrem(`${PREFIX}:pending:outgoing:${req.fromUserId}`, reqId);
    planDel(`${PREFIX}:friendreq:${reqId}`);
  }
  planDel(`${PREFIX}:pending:incoming:${userId}`);

  // 7. Notifications — the user's own set + objects
  const notifIds =
    (await kv.smembers(`${PREFIX}:notifications:user:${userId}`)) || [];
  for (const id of notifIds) planDel(`${PREFIX}:notification:${id}`);
  planDel(`${PREFIX}:notifications:user:${userId}`);
  planDel(`${PREFIX}:notifications:user:${userId}:unread`);

  // 7b. Notifications elsewhere that reference this user (best-effort scan)
  for await (const key of scanMatch(`${PREFIX}:notification:*`)) {
    const notif = await kv.get(key);
    if (!notif) continue;
    if (notif.userId === userId || notif.relatedUserId === userId) {
      planDel(key);
      if (notif.userId && notif.userId !== userId) {
        planSrem(`${PREFIX}:notifications:user:${notif.userId}`, notif.id);
        planSrem(`${PREFIX}:notifications:user:${notif.userId}:unread`, notif.id);
      }
    }
  }

  // --- report ---
  console.log(`\nPlanned deletions: ${toDelete.size} keys`);
  for (const k of toDelete) console.log(`  DEL  ${k}`);
  console.log(`Planned set removals: ${setRemovals.length}`);
  for (const { key, member } of setRemovals)
    console.log(`  SREM ${key} <- ${member}`);

  if (dryRun) {
    console.log("\n--dry-run: no changes made.");
    return;
  }

  // --- execute ---
  for (const { key, member } of setRemovals) await kv.srem(key, member);
  if (toDelete.size) await kv.del(...toDelete);

  console.log(`\n✓ Deleted user ${email} (${userId}) and all related data.`);
}

async function* scanMatch(pattern) {
  let cursor = 0;
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 200 });
    cursor = Number(next);
    for (const k of keys) yield k;
  } while (cursor !== 0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
