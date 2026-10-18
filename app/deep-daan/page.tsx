import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import { getSevaToday } from "@/lib/seva/today";
import { SEVA_EVENTS } from "@/lib/seva/events";
import { istNow } from "@/lib/seva/time";
import Paywall from "@/components/billing/Paywall";
import DeepDaan from "@/components/seva/DeepDaan";

export const metadata = { title: "Kartik Deep Daan — Radhe Radhe" };

export default async function DeepDaanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const access = await getAccess(session.user.id);
  if (!access.hasAccess) return <Paywall access={access} />;

  const today = await getSevaToday(session.user.id);
  if (!today.event) {
    const next = SEVA_EVENTS.find((e) => e.start > istNow().date);
    return (
      <main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <div className="font-deva text-4xl text-primary">दीपदान</div>
        <p className="mt-3 max-w-xs text-sm text-muted">
          {next
            ? `Deep daan Kartik maas mein hota hai. Agla Kartik ${new Date(`${next.start}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })} se shuru hoga.`
            : "Deep daan Kartik maas mein hota hai."}
        </p>
        <Link href="/" className="mt-6 text-sm font-medium text-primary">
          ← Jaap par lautein
        </Link>
      </main>
    );
  }

  return <DeepDaan initial={today} />;
}
