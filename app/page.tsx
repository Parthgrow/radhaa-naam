import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import TopBar from "@/components/TopBar";
import ChantArea from "@/components/ChantArea";
import StatsBar from "@/components/StatsBar";
import SevenDayStrip from "@/components/SevenDayStrip";
import WeeklySyncTrigger from "@/components/WeeklySyncTrigger";
import Paywall from "@/components/billing/Paywall";
import TrialBanner from "@/components/billing/TrialBanner";
import EventBanner from "@/components/seva/EventBanner";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const access = await getAccess(session.user.id);
  if (!access.hasAccess) return <Paywall access={access} />;

  return (
    <main className="flex min-h-svh flex-col">
      <WeeklySyncTrigger />
      <TopBar />
      <TrialBanner access={access} />
      <EventBanner />
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <ChantArea />
      </div>
      <StatsBar />
      <SevenDayStrip />
    </main>
  );
}
