import { GlassCard } from "@/components/ui/glass-card";

export default function Page() {
  return (
    <div className="px-6 md:px-12 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold">Social & Leaderboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="p-6 h-40" />
        <GlassCard className="p-6 h-40" />
        <GlassCard className="p-6 h-40" />
      </div>
    </div>
  );
}


