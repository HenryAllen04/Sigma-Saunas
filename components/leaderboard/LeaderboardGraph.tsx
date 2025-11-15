"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

export type LeaderboardGraphProps = {
	title?: string
	description?: string
	users: {
		id: string
		name: string
		avatar: string
		maxTemp: number
		totalMinutes: number
		streak: number
	}[]
}

type Metric = "streak" | "totalMinutes" | "maxTemp"

const METRIC_LABEL: Record<Metric, string> = {
	streak: "Streak (days)",
	totalMinutes: "Total Minutes",
	maxTemp: "Max Temp (°C)",
}

export function LeaderboardGraph(props: LeaderboardGraphProps) {
	const { title = "Graph View", description = "Visualize sauna performance.", users } = props
	const [metric, setMetric] = React.useState<Metric>("streak")

	const data = React.useMemo(() => {
		const sorted = [...users].sort((a, b) => {
			const av = a[metric]
			const bv = b[metric]
			return (bv as number) - (av as number)
		})
		return sorted.map((u) => ({
			name: u.name,
			value: u[metric] as number,
		}))
	}, [users, metric])

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<div className="inline-flex rounded-md border border-white/10 p-1">
					<SegmentedButton active={metric === "streak"} onClick={() => setMetric("streak")}>
						Streaks
					</SegmentedButton>
					<SegmentedButton active={metric === "totalMinutes"} onClick={() => setMetric("totalMinutes")}>
						Minutes
					</SegmentedButton>
					<SegmentedButton active={metric === "maxTemp"} onClick={() => setMetric("maxTemp")}>
						Max Temp
					</SegmentedButton>
				</div>
			</CardHeader>
			<CardContent className="h-[360px] sm:h-[420px]">
				<div className="h-full rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-3">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
						>
							<CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
							<XAxis
								dataKey="name"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
							/>
							<YAxis
								width={36}
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								contentStyle={{
									backgroundColor: "rgba(17, 17, 17, 0.9)",
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: 8,
									color: "white",
								}}
								labelStyle={{ color: "rgba(255,255,255,0.9)" }}
								formatter={(value: number) => {
									if (metric === "maxTemp") return [`${value}°C`, METRIC_LABEL[metric]]
									if (metric === "totalMinutes") return [`${value} min`, METRIC_LABEL[metric]]
									return [`${value} days`, METRIC_LABEL[metric]]
								}}
							/>
							<defs>
								<linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
									<stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
								</linearGradient>
							</defs>
							<Bar
								dataKey="value"
								radius={6}
								fill="url(#barFill)"
								isAnimationActive
								animationBegin={120}
								animationDuration={600}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	)
}

function SegmentedButton(props: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
	const { active, onClick, children } = props
	return (
		<Button
			type="button"
			variant="ghost"
			onClick={onClick}
			className={cn(
				"px-3 py-1 text-xs sm:text-sm",
				active
					? "bg-white/10 text-white"
					: "text-white/70 hover:text-white"
			)}
		>
			{children}
		</Button>
	)
}


