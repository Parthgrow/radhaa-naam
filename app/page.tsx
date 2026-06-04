import TopBar from "@/components/TopBar";
import ChantArea from "@/components/ChantArea";
import StatsBar from "@/components/StatsBar";
import SevenDayStrip from "@/components/SevenDayStrip";

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col">
      <TopBar />
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <ChantArea />
      </div>
      <StatsBar />
      <SevenDayStrip />
    </main>
  );
}
