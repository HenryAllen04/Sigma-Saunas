import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center">
          <div className="flex w-full items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-2" />
              <div className="hidden md:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Guided Sessions
                </h1>
                <p className="text-sm text-white/60">Choose your session type</p>
              </div>
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4" />
              Profile
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 px-6 md:px-12 pb-10">
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
      </SidebarInset>
    </SidebarProvider>
  );
}


