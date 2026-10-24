import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import { isRadhaRaniAwake } from "@/lib/kv/seva";
import TopBar from "@/components/TopBar";
import ChantArea from "@/components/ChantArea";
import StatsBar from "@/components/StatsBar";
import SevenDayStrip from "@/components/SevenDayStrip";
import WeeklySyncTrigger from "@/components/WeeklySyncTrigger";
import Paywall from "@/components/billing/Paywall";
import TrialBanner from "@/components/billing/TrialBanner";
import DarshanBanner from "@/components/seva/DarshanBanner";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const access = await getAccess(session.user.id);
  if (!access.hasAccess) return <Paywall access={access} />;

  // The banner is a nicety: never let a hiccup reading it break the home screen
  const awake = await isRadhaRaniAwake(session.user.id).catch(() => null);

  return (
    <main className="flex min-h-svh flex-col">
      <WeeklySyncTrigger />
      <TopBar />
      <TrialBanner access={access} />
      <DarshanBanner awake={awake} />
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <ChantArea />
      </div>
      <StatsBar />
      <SevenDayStrip />
    </main>
  );
}
