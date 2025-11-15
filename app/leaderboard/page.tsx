import { AppSidebar } from "@/components/app-sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { leaderboard as leaderboardData } from "@/lib/data/leaderboard"
import React from "react"

function MobileLeaderboard() {
  const sorted = [...leaderboardData].sort((a, b) => b.streak - a.streak)
  return (
    <div className="space-y-3 md:hidden">
      {sorted.map((u) => (
        <div
          key={u.id}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white/70">#{u.rank}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar} alt={u.name} />
                <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{u.name}</span>
            </div>
            <span className="text-sm font-semibold">{u.streak}d</span>
          </div>
          <Separator className="my-3 opacity-20" />
          <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="text-white/90">{u.totalMinutes}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Max</span>
              <span className="text-white/90">{u.maxTemp}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Streak</span>
              <span className="text-white/90">{u.streak} days</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DesktopLeaderboard() {
  const sorted = [...leaderboardData].sort((a, b) => b.streak - a.streak)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Track sauna streaks and performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Total Minutes</TableHead>
                <TableHead>Max Temp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-white/80">#{u.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar} alt={u.name} />
                        <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{u.streak} days</TableCell>
                  <TableCell>{u.totalMinutes} min</TableCell>
                  <TableCell>{u.maxTemp}°C</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <MobileLeaderboard />
      </CardContent>
    </Card>
  )
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Leaderboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <DesktopLeaderboard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


