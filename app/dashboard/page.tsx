import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { GlassCard } from "@/components/ui/glass-card"
import { EmberGlow } from "@/components/ui/ember-glow"
import { Activity, Flame, Heart, Thermometer, Droplets, Sparkles } from "lucide-react"
import Link from "next/link"

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
                  Good evening, Alex
                </h1>
                <p className="text-sm text-white/60">Ready for a session?</p>
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
          {/* Live Status Card */}
          <EmberGlow className="mx-auto mt-2 w-full max-w-5xl">
            <GlassCard className="p-6 md:p-10">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-4xl font-bold">
                      <Thermometer className="h-8 w-8 text-white/70" />
                      <span className="drop-shadow-[0_0_20px_rgba(255,200,60,0.35)]">82°C</span>
                    </div>
                    <div className="flex items-center gap-2 text-2xl font-semibold text-white/80">
                      <Droplets className="h-6 w-6 text-white/60" />
                      <span>33%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Flame className="h-5 w-5 text-orange-300/80" />
                    <span>Sauna detected nearby</span>
                  </div>
                </div>
                <div className="flex md:justify-end">
                  <Link
                    href="#"
                    className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/25 backdrop-blur-md"
                  >
                    Start Session
                  </Link>
                </div>
              </div>
            </GlassCard>
          </EmberGlow>

          {/* Inline strip and quick actions */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Heart rate pill */}
            <EmberGlow className="rounded-full">
              <GlassCard className="rounded-full px-5 py-3">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-rose-300" />
                  <span className="text-sm">72 bpm</span>
                  <span className="mx-2 text-white/30">•</span>
                  <span className="text-sm text-white/80">Resting</span>
                </div>
              </GlassCard>
            </EmberGlow>

            {/* Quick actions */}
            <div className="col-span-2">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Guided", icon: Sparkles },
                  { label: "Coach", icon: Activity },
                  { label: "Social", icon: Flame },
                  { label: "Code", icon: Heart },
                ].map((a) => (
                  <EmberGlow key={a.label}>
                    <GlassCard
                    className="flex items-center justify-center px-3 py-4 text-sm hover:bg-white/12"
                  >
                    <div className="flex items-center gap-2">
                      <a.icon className="h-4 w-4 text-white/70" />
                      <span>{a.label}</span>
                    </div>
                    </GlassCard>
                  </EmberGlow>
                ))}
              </div>
            </div>
          </div>

          {/* Lower grid: Progress, AI Coach */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Weekly Progress */}
            <EmberGlow className="md:col-span-2">
              <GlassCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-medium">Sauna Time This Week</h3>
                <span className="text-sm text-white/60">32 minutes • +12%</span>
              </div>
              {/* Simple bar chart mock */}
              <div className="grid grid-cols-7 gap-2 pt-2">
                {[4, 6, 3, 5, 2, 7, 1].map((h, i) => (
                  <div
                    key={i}
                    className="relative h-24 w-full overflow-hidden rounded-md bg-white/5"
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-amber-400/70 to-amber-200/30"
                      style={{ height: `${h * 12}%` }}
                    />
                  </div>
                ))}
              </div>
              </GlassCard>
            </EmberGlow>

            {/* AI Coach */}
            <EmberGlow>
              <GlassCard className="p-5">
              <h3 className="mb-2 text-base font-medium">Insight of the Day</h3>
              <p className="text-sm text-white/80">
                Your HRV improved after yesterday’s session. A gentle 12-minute
                zen heat today would help recovery.
              </p>
              </GlassCard>
            </EmberGlow>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
