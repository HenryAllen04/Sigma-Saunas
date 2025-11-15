import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

const categories = [
  { name: "Traditional", href: "/guided/traditional", emoji: "🔥" },
  { name: "Zen", href: "/guided/zen", emoji: "🧘" },
  { name: "Recovery", href: "/guided/recovery", emoji: "🛠" },
  { name: "Coding Mode", href: "/guided/coding-mode", emoji: "💻" },
  { name: "Corporate", href: "/guided/corporate", emoji: "💼" },
  { name: "Beginner Safe Mode", href: "/guided/beginner", emoji: "🍼" },
];

export default function Page() {
  return (
    <div className="px-6 md:px-12 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold">Guided Sessions</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Link key={cat.href} href={cat.href}>
            <GlassCard className="p-6 hover:bg-white/12 transition-colors">
              <div className="text-lg">{cat.emoji} {cat.name}</div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}


