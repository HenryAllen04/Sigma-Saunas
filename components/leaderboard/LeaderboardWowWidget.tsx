"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"

type Metric = "streak" | "totalMinutes" | "maxTemp"

export type LeaderboardWowWidgetProps = {
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

const METRIC_LABEL: Record<Metric, string> = {
	streak: "Streak (days)",
	totalMinutes: "Total Minutes",
	maxTemp: "Max Temp (°C)",
}

const METRIC_COLORS: Record<Metric, { start: string; end: string; id: string; activeId: string }> = {
	streak: {
		start: "rgba(255,215,130,1)",
		end: "rgba(255,140,60,0.5)",
		id: "grad-streak",
		activeId: "grad-streak-active",
	},
	totalMinutes: {
		start: "rgba(130,235,255,1)",
		end: "rgba(60,150,255,0.5)",
		id: "grad-minutes",
		activeId: "grad-minutes-active",
	},
	maxTemp: {
		start: "rgba(255,160,200,1)",
		end: "rgba(255,80,110,0.5)",
		id: "grad-temp",
		activeId: "grad-temp-active",
	},
}

export function LeaderboardWowWidget(props: LeaderboardWowWidgetProps) {
	const { title = "Performance Overview", description = "Compare streaks, minutes and max temp.", users } = props
	const [primary, setPrimary] = React.useState<Metric>("streak")
	const [visible, setVisible] = React.useState<Record<Metric, boolean>>({
		streak: true,
		totalMinutes: true,
		maxTemp: true,
	})

	const data = React.useMemo(() => {
		const sorted = [...users].sort((a, b) => (b[primary] as number) - (a[primary] as number))
		return sorted.map((u) => ({
			name: u.name,
			avatar: u.avatar,
			streak: u.streak,
			totalMinutes: u.totalMinutes,
			maxTemp: u.maxTemp,
		}))
	}, [users, primary])

	const averages = React.useMemo(() => {
		const base = { streak: 0, totalMinutes: 0, maxTemp: 0 }
		if (users.length === 0) return base
		for (const u of users) {
			base.streak += u.streak
			base.totalMinutes += u.totalMinutes
			base.maxTemp += u.maxTemp
		}
		return {
			streak: Math.round((base.streak / users.length) * 10) / 10,
			totalMinutes: Math.round((base.totalMinutes / users.length) * 10) / 10,
			maxTemp: Math.round((base.maxTemp / users.length) * 10) / 10,
		}
	}, [users])

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					{/* Primary sort selector */}
					<div className="inline-flex rounded-md border border-white/10 p-1">
						<SegmentedTab active={primary === "streak"} onClick={() => setPrimary("streak")}>
							Sort: Streaks
						</SegmentedTab>
						<SegmentedTab active={primary === "totalMinutes"} onClick={() => setPrimary("totalMinutes")}>
							Sort: Minutes
						</SegmentedTab>
						<SegmentedTab active={primary === "maxTemp"} onClick={() => setPrimary("maxTemp")}>
							Sort: Max Temp
						</SegmentedTab>
					</div>
					{/* Visibility toggles */}
					<div className="hidden sm:inline-flex rounded-md border border-white/10 p-1">
						<TogglePill
							label="Streaks"
							active={visible.streak}
							colorClass="from-[rgba(255,215,130,0.25)] to-[rgba(255,140,60,0.15)]"
							onClick={() => setVisible((v) => ({ ...v, streak: !v.streak }))}
						/>
						<TogglePill
							label="Minutes"
							active={visible.totalMinutes}
							colorClass="from-[rgba(130,235,255,0.25)] to-[rgba(60,150,255,0.15)]"
							onClick={() => setVisible((v) => ({ ...v, totalMinutes: !v.totalMinutes }))}
						/>
						<TogglePill
							label="Max Temp"
							active={visible.maxTemp}
							colorClass="from-[rgba(255,160,200,0.25)] to-[rgba(255,80,110,0.15)]"
							onClick={() => setVisible((v) => ({ ...v, maxTemp: !v.maxTemp }))}
						/>
					</div>
				</div>
			</CardHeader>
			<CardContent className="h-[380px] sm:h-[440px]">
				<div className="h-full surface-glass p-3">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
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
							<Tooltip content={<CustomTooltip metricLabelMap={METRIC_LABEL} />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
							<Legend
								wrapperStyle={{ color: "rgba(255,255,255,0.8)" }}
								formatter={(value) => {
									if (value === "streak") return "Streaks"
									if (value === "totalMinutes") return "Minutes"
									if (value === "maxTemp") return "Max Temp"
									return value
								}}
							/>

							<defs>
								{/* gradients */}
								{(Object.keys(METRIC_COLORS) as Metric[]).map((key) => {
									const cfg = METRIC_COLORS[key]
									return (
										<React.Fragment key={key}>
											<linearGradient id={cfg.id} x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor={cfg.start} />
												<stop offset="100%" stopColor={cfg.end} />
											</linearGradient>
											<linearGradient id={cfg.activeId} x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor={cfg.start} />
												<stop offset="100%" stopColor={cfg.start} />
											</linearGradient>
										</React.Fragment>
									)
								})}
							</defs>

							{/* average lines */}
							{visible.streak && (
								<ReferenceLine y={averages.streak} stroke="rgba(255,215,130,0.6)" strokeDasharray="4 4" label={{ value: "avg", fill: "rgba(255,215,130,0.8)", fontSize: 10 }} />
							)}
							{visible.totalMinutes && (
								<ReferenceLine y={averages.totalMinutes} stroke="rgba(130,235,255,0.6)" strokeDasharray="4 4" label={{ value: "avg", fill: "rgba(130,235,255,0.9)", fontSize: 10 }} />
							)}
							{visible.maxTemp && (
								<ReferenceLine y={averages.maxTemp} stroke="rgba(255,160,200,0.6)" strokeDasharray="4 4" label={{ value: "avg", fill: "rgba(255,160,200,0.9)", fontSize: 10 }} />
							)}

							{visible.streak && (
								<Bar
									dataKey="streak"
									name="streak"
									fill={`url(#${METRIC_COLORS.streak.id})`}
									radius={6}
									barSize={18}
									isAnimationActive
									animationBegin={120}
									animationDuration={600}
									activeBar={{ fill: `url(#${METRIC_COLORS.streak.activeId})`, stroke: "rgba(255,255,255,0.7)", radius: 8 }}
								/>
							)}

							{visible.totalMinutes && (
								<Bar
									dataKey="totalMinutes"
									name="totalMinutes"
									fill={`url(#${METRIC_COLORS.totalMinutes.id})`}
									radius={6}
									barSize={18}
									isAnimationActive
									animationBegin={160}
									animationDuration={650}
									activeBar={{ fill: `url(#${METRIC_COLORS.totalMinutes.activeId})`, stroke: "rgba(255,255,255,0.7)", radius: 8 }}
								/>
							)}

							{visible.maxTemp && (
								<Bar
									dataKey="maxTemp"
									name="maxTemp"
									fill={`url(#${METRIC_COLORS.maxTemp.id})`}
									radius={6}
									barSize={18}
									isAnimationActive
									animationBegin={200}
									animationDuration={700}
									activeBar={{ fill: `url(#${METRIC_COLORS.maxTemp.activeId})`, stroke: "rgba(255,255,255,0.7)", radius: 8 }}
								/>
							)}
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
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

function TogglePill(props: { label: string; active: boolean; onClick: () => void; colorClass: string }) {
	const { label, active, onClick, colorClass } = props
	return (
		<Button
			type="button"
			variant="ghost"
			onClick={onClick}
			className={cn(
				"px-3 py-1 text-xs sm:text-sm",
				active
					? cn("text-white", `bg-gradient-to-b ${colorClass}`)
					: "text-white/70 hover:text-white"
			)}
		>
			{label}
		</Button>
	)
}

function CustomTooltip(props: any) {
	const { active, payload, label, metricLabelMap } = props as {
		active?: boolean
		label?: string
		payload?: { dataKey: string; value: number; payload: any }[]
		metricLabelMap: Record<Metric, string>
	}
	if (!active || !payload || payload.length === 0) return null
	const row = payload[0].payload
	const [src, setSrc] = React.useState<string>(row.avatar)
	const [attempt, setAttempt] = React.useState<number>(0)
	const onError = React.useCallback(() => {
		if (attempt >= 2) return
		const next = (() => {
			if (src.endsWith(".png")) return src.replace(/\.png$/i, ".jpg")
			if (src.endsWith(".jpg")) return src.replace(/\.jpg$/i, ".png")
			if (src.endsWith(".jpeg")) return src.replace(/\.jpeg$/i, ".png")
			return `${src}.png`
		})()
		setAttempt((a) => a + 1)
		setSrc(next)
	}, [attempt, src])
	return (
		<div
			className="surface-glass px-3 py-2 text-xs"
		>
			<div className="mb-2 flex items-center gap-2">
				<Avatar className="h-6 w-6 ring-1 ring-white/10">
					<AvatarImage src={src} alt={label} onError={onError} />
					<AvatarFallback>{(label as string)?.slice(0, 2)?.toUpperCase()}</AvatarFallback>
				</Avatar>
				<div className="font-medium">{label}</div>
			</div>
			<div className="grid grid-cols-1 gap-1">
				<div className="flex items-center justify-between">
					<span className="text-white/70">{metricLabelMap.streak}</span>
					<span>{row.streak} days</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-white/70">{metricLabelMap.totalMinutes}</span>
					<span>{row.totalMinutes} min</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-white/70">{metricLabelMap.maxTemp}</span>
					<span>{row.maxTemp}°C</span>
				</div>
			</div>
		</div>
	)
}


