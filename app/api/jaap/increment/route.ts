import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getLifetime, incrementDay } from "@/lib/kv/daily-jaap";
import { isDateKey } from "@/lib/jaap-validation";
import type { DayTotals } from "@/lib/kv/types";

const MAX_OPS = 31;
const MAX_DELTA = 1_000_000;
const OP_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

type Op = { opId: string; date: string; beads: number; malas: number };

function isDelta(value: unknown): value is number {
  return Number.isInteger(value) && Math.abs(value as number) <= MAX_DELTA;
}

function parseOps(body: unknown): Op[] | null {
  const ops = (body as { ops?: unknown } | null)?.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS) return null;
  for (const op of ops) {
    if (
      !op ||
      typeof op.opId !== "string" ||
      !OP_ID_RE.test(op.opId) ||
      !isDateKey(op.date) ||
      !isDelta(op.beads) ||
      !isDelta(op.malas)
    ) {
      return null;
    }
  }
  return ops as Op[];
}

/**
 * Apply changes ("+3 beads to 2026-10-02") rather than overwriting totals, so
 * saves can arrive in any order, from any device. Each op is applied at most
 * once per opId, so the client can safely retry a batch.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ops = parseOps(body);
  if (!ops) {
    return Response.json(
      { error: `Expected { ops: [{ opId, date, beads, malas }] } with 1-${MAX_OPS} ops` },
      { status: 400 }
    );
  }

  try {
    const days: Record<string, DayTotals> = {};
    for (const op of ops) {
      days[op.date] = await incrementDay(userId, op.opId, op.date, op.beads, op.malas);
    }
    const lifetime = await getLifetime(userId);
    return Response.json({ success: true, data: { days, lifetime } });
  } catch (error) {
    console.error("Error in increment:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
