import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";

const items = [
  { name: "Profile", href: "/settings/profile" },
  { name: "Integrations", href: "/settings/integrations" },
  { name: "Notifications", href: "/settings/notifications" },
  { name: "Safety", href: "/settings/safety" },
];

export default function Page() {
  return (
    <div className="px-6 md:px-12 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <GlassCard className="p-6 h-32 hover:bg-white/12 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}


