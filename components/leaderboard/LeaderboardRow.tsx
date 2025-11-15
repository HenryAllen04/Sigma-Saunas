"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type LeaderboardRowProps = {
	user: {
		id: string
		name: string
		avatar: string
		maxTemp: number
		totalMinutes: number
		streak: number
	}
	rank: number
}

export function LeaderboardRow(props: LeaderboardRowProps) {
	const { user, rank } = props
	const isTop = rank === 1

	return (
		<TableRow
			className={cn(
				"hover:bg-white/5",
				isTop && "relative border-white/20"
			)}
		>
			<TableCell className={cn("font-medium text-white/80", isTop && "text-white")}>
				#{rank}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"rounded-full p-[2px]",
							isTop
								? "bg-gradient-to-r from-white/20 via-white/5 to-transparent"
								: "bg-transparent"
						)}
					>
						<Avatar className="h-8 w-8 ring-1 ring-white/10">
							<AvatarImage src={user.avatar} alt={user.name} />
							<AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
						</Avatar>
					</div>
					<span className={cn(isTop ? "font-semibold text-white" : "text-white/90")}>
						{user.name}
					</span>
				</div>
			</TableCell>
			<TableCell className="font-semibold">{user.streak} days</TableCell>
			<TableCell>{user.totalMinutes} min</TableCell>
			<TableCell>{user.maxTemp}°C</TableCell>
		</TableRow>
	)
}


