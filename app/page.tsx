import TopBar from "@/components/TopBar";
import ChantArea from "@/components/ChantArea";
import StatsBar from "@/components/StatsBar";
import SevenDayStrip from "@/components/SevenDayStrip";
import WeeklySyncTrigger from "@/components/WeeklySyncTrigger";
import FeatureGate from "@/components/FeatureGate";

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col">
      <WeeklySyncTrigger />
      <TopBar />
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <FeatureGate>
          <ChantArea />
        </FeatureGate>
      </div>
      <StatsBar />
      <SevenDayStrip />
    </main>
  );
}
