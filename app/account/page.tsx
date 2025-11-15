import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="px-6 md:px-12 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold">User Account</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6 h-40" />
        <Link href="/account/subscription">
          <GlassCard className="p-6 h-40 hover:bg-white/12 transition-colors" />
        </Link>
      </div>
    </div>
  );
}


