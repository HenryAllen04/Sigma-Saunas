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
import { Separator } from "@/components/ui/separator"
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar"
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable"
import { leaderboard as leaderboardData } from "@/lib/data/leaderboard"

export default function Page() {
	const users = React.useMemo(
		() =>
			leaderboardData.map((u) => ({
				id: u.id,
				name: u.name,
				avatar: u.avatar,
				rank: u.rank,
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
						<LeaderboardTable users={users} />
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}

