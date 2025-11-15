"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar"
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable"
import { LeaderboardGraph } from "@/components/leaderboard/LeaderboardGraph"
import { leaderboard as leaderboardData } from "@/lib/data/leaderboard"
import { cn } from "@/lib/utils"

type ViewMode = "leaderboard" | "graph"

export default function Page() {
	const [view, setView] = React.useState<ViewMode>("leaderboard")

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
	)

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
					<Card className="border-white/10 bg-transparent p-3">
						<div className="flex items-center justify-between gap-3">
							<div className="text-sm text-white/70">View</div>
							<div className="inline-flex rounded-md border border-white/10 p-1">
								<SegmentedTab active={view === "leaderboard"} onClick={() => setView("leaderboard")}>
									Leaderboard
								</SegmentedTab>
								<SegmentedTab active={view === "graph"} onClick={() => setView("graph")}>
									Graph View
								</SegmentedTab>
							</div>
						</div>
					</Card>

					{view === "leaderboard" ? (
						<LeaderboardTable users={users} />
					) : (
						<LeaderboardGraph users={users} />
					)}
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}

function SegmentedTab(props: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
	const { active, onClick, children } = props
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
	)
}


