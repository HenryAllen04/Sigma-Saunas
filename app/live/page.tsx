import { GlassCard } from "@/components/ui/glass-card";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";
import Link from "next/link";

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
                  Live Session
                </h1>
                <p className="text-sm text-white/60">Track your sauna session in real-time</p>
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
          <GlassCard className="p-8">
            <p className="text-white/80">Live session UI placeholder.</p>
          </GlassCard>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


