import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";

const items = [
  { name: "Profile", href: "/settings/profile" },
  { name: "Integrations", href: "/settings/integrations" },
  { name: "Notifications", href: "/settings/notifications" },
  { name: "Safety", href: "/settings/safety" },
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
                  Settings
                </h1>
                <p className="text-sm text-white/60">Manage your preferences</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((it) => (
              <Link key={it.href} href={it.href}>
                <GlassCard className="p-6 h-32 hover:bg-white/12 transition-colors">
                  <p className="text-lg font-medium">{it.name}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


