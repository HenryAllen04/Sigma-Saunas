"use client";

import * as React from "react";
import {
  AudioLines,
  Command,
  History,
  LifeBuoy,
  Send,
  SquareTerminal,
  Trophy,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Perttu Rönkkö",
    email: "perttu@sigmasaunas.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Session History",
      url: "/history",
      icon: History,
    },
    {
      title: "Social & Leaderboard",
      url: "/social",
      icon: Trophy,
    },
    // {
    //   title: "Voice",
    //   url: "/voice",
    //   icon: AudioLines,
    //   items: [
    //     {
    //       title: "Start Session",
    //       url: "/voice",
    //     },
    //     {
    //       title: "Recordings",
    //       url: "#",
    //     },
    //     {
    //       title: "Transcripts",
    //       url: "#",
    //     },
    //     {
    //       title: "Analytics",
    //       url: "#",
    //     },
    //   ],
    // },
  ],
  navSecondary: [
    
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <div className="relative rounded-2xl">
      {/* Orange/Gold subtle glow around the sidebar frame */}
      <div className="absolute inset-0 -z-10 rounded-2xl pointer-events-none [box-shadow:0_0_120px_30px_rgba(255,165,60,0.12)]" />
      <Sidebar
        variant="inset"
        className="bg-transparent backdrop-blur-md"
        {...props}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">SigmaSaunas</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
      </Sidebar>
    </div>
  );
}
