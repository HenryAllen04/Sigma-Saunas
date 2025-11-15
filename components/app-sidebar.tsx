"use client"

import * as React from "react"
import {
  AudioLines,
  BookOpen,
  Bot,
  Command,
  Compass,
  Flame,
  History,
  LifeBuoy,
  Send,
  Settings2,
  SquareTerminal,
  Trophy,
  User,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Alex Chen",
    email: "alex@sigmasaunas.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Live Session",
      url: "/live",
      icon: Flame,
    },
    {
      title: "Guided Sessions",
      url: "/guided",
      icon: Compass,
      items: [
        {
          title: "Traditional",
          url: "/guided/traditional",
        },
        {
          title: "Zen",
          url: "/guided/zen",
        },
        {
          title: "Recovery",
          url: "/guided/recovery",
        },
        {
          title: "Coding Mode",
          url: "/guided/coding-mode",
        },
        {
          title: "Corporate",
          url: "/guided/corporate",
        },
        {
          title: "Beginner Safe Mode",
          url: "/guided/beginner",
        },
      ],
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
      items: [
        { title: "Weekly", url: "/social?tab=weekly" },
        { title: "All-Time", url: "/social?tab=all-time" },
        { title: "Streaks", url: "/social?tab=streaks" },
        { title: "Friends Only", url: "/social?tab=friends" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "/settings/profile",
        },
        {
          title: "Integrations",
          url: "/settings/integrations",
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
        },
        {
          title: "Safety",
          url: "/settings/safety",
        },
      ],
    },
    {
      title: "User Account",
      url: "/account",
      icon: User,
      items: [
        {
          title: "Subscription",
          url: "/account/subscription",
        },
      ],
    },
    {
      title: "Voice",
      url: "/voice",
      icon: AudioLines,
      items: [
        {
          title: "Start Session",
          url: "/voice",
        },
        {
          title: "Recordings",
          url: "#",
        },
        {
          title: "Transcripts",
          url: "#",
        },
        {
          title: "Analytics",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <div className="relative rounded-2xl">
      {/* Orange/Gold subtle glow around the sidebar frame */}
      <div className="absolute inset-0 -z-10 rounded-2xl pointer-events-none [box-shadow:0_0_120px_30px_rgba(255,165,60,0.12)]" />
      <Sidebar variant="inset" className="bg-transparent backdrop-blur-md" {...props}>
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
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      </Sidebar>
    </div>
  )
}

