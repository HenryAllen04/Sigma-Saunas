"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LeaderboardRow } from "./LeaderboardRow"
import { Separator } from "@/components/ui/separator"

export type LeaderboardUser = {
	id: string
	name: string
	avatar: string
	maxTemp: number
	totalMinutes: number
	streak: number
}

export type LeaderboardTableProps = {
	title?: string
	description?: string
	users: LeaderboardUser[]
}

function MobileList(props: { users: LeaderboardUser[] }) {
	const users = props.users
	return (
		<div className="space-y-3 md:hidden">
			{users.map((u, idx) => {
				const rank = idx + 1
				const isTop = rank === 1
				return (
					<div
						key={u.id}
						className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span className="text-sm font-semibold text-white/70">#{rank}</span>
								<div className={isTop ? "rounded-full p-[2px] bg-gradient-to-r from-white/20 via-white/5 to-transparent" : ""}>
									<Avatar className="h-8 w-8 ring-1 ring-white/10">
										<AvatarImage src={u.avatar} alt={u.name} />
										<AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
									</Avatar>
								</div>
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
				)
			})}
		</div>
	)
}

export function LeaderboardTable(props: LeaderboardTableProps) {
	const { title = "Leaderboard", description = "Track sauna streaks and performance.", users } = props
	const sorted = React.useMemo(() => {
		return [...users].sort((a, b) => b.streak - a.streak)
	}, [users])

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
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
							{sorted.map((user, index) => (
								<LeaderboardRow key={user.id} user={user} rank={index + 1} />
							))}
						</TableBody>
					</Table>
				</div>
				<MobileList users={sorted} />
			</CardContent>
		</Card>
	)
}


