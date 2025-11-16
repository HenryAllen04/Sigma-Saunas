"use client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
 
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardGraph } from "@/components/leaderboard/LeaderboardGraph";
import { LeaderboardHeatBattle } from "@/components/leaderboard/LeaderboardHeatBattle";
import { leaderboard as leaderboardData } from "@/lib/data/leaderboard";
import { cn } from "@/lib/utils";

type ViewMode = "leaderboard" | "graph";

export default function Page() {
  const [view, setView] = React.useState<ViewMode>("leaderboard");

  const users = React.useMemo(
    () =>
      leaderboardData.map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        maxTemp: u.maxTemp,
        totalMinutes: u.totalMinutes,
        streak: u.streak,
      })),
    []
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-20 shrink-0 items-center">
          <div className="flex w-full items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-2" />
              <div className="hidden md:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Social & Leaderboard
                </h1>
                <p className="text-sm text-white/60">Connect with the community</p>
              </div>
            </div>
            
          </div>
        </header>
        <div className="px-6 md:px-12 pb-10"> 
          <LeaderboardTable users={users} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SegmentedTab(props: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  const { active, onClick, children } = props;
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs sm:text-sm",
        active ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
      )}
    >
      {children}
    </Button>
  );
}


