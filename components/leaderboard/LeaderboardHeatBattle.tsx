"use client"

import * as React from "react"
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type Metric = "streak" | "totalMinutes" | "maxTemp"

export type LeaderboardHeatBattleProps = {
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

export function LeaderboardHeatBattle(props: LeaderboardHeatBattleProps) {
	const { title = "Heat Battle", description = "Sauna-themed performance visualization.", users } = props
	const [metric, setMetric] = React.useState<Metric>("streak")

	const maxByMetric = React.useMemo(() => {
		const values = users.map((u) => u[metric] as number)
		return Math.max(1, ...values)
	}, [users, metric])

	const data = React.useMemo(() => {
		const calcIntensity = (u: (typeof users)[number]) => {
			// When metric is "streak", glow intensity follows maxTemp to emphasize heat.
			// Otherwise, intensity follows the selected metric to stay consistent.
			const base = metric === "streak" ? u.maxTemp : (u[metric] as number)
			// Normalize 0..1
			const all = users.map((x) => (metric === "streak" ? x.maxTemp : (x[metric] as number)))
			const min = Math.min(...all)
			const max = Math.max(...all, 1)
			return (base - min) / (max - min || 1)
		}

		return [...users]
			.sort((a, b) => (b[metric] as number) - (a[metric] as number))
			.map((u) => ({
				name: u.name,
				avatar: u.avatar,
				value: u[metric] as number,
				intensity: calcIntensity(u),
				streak: u.streak,
				totalMinutes: u.totalMinutes,
				maxTemp: u.maxTemp,
			}))
	}, [users, metric])

	const avg = React.useMemo(() => {
		if (users.length === 0) return 0
		const sum = users.reduce((acc, u) => acc + (u[metric] as number), 0)
		return sum / users.length
	}, [users, metric])

	const avatarMap = React.useMemo(() => {
		const m = new Map<string, string>()
		users.forEach((u) => m.set(u.name, u.avatar))
		return m
	}, [users])

	return (
		<Card className="surface-glass">
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<div className="inline-flex rounded-md border border-white/10 p-1">
					<SegmentedTab active={metric === "streak"} onClick={() => setMetric("streak")}>
						Streaks
					</SegmentedTab>
					<SegmentedTab active={metric === "totalMinutes"} onClick={() => setMetric("totalMinutes")}>
						Minutes
					</SegmentedTab>
					<SegmentedTab active={metric === "maxTemp"} onClick={() => setMetric("maxTemp")}>
						Max Temp
					</SegmentedTab>
				</div>
			</CardHeader>
			<CardContent className="h-[420px]">
				<div className="h-full surface-glass p-3">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 8, right: 12, bottom: 40, left: 0 }}>
							<CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
							<XAxis
								dataKey="name"
								tickLine={false}
								axisLine={false}
								interval={0}
								height={56}
								tick={<AvatarTick avatarMap={avatarMap} />}
							/>
							<YAxis
								width={36}
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
								domain={[0, Math.max(maxByMetric, Math.ceil(avg))]}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								content={<HeatTooltip />}
							/>
							<defs>
								<linearGradient id="heat-gradient" x1="0" y1="1" x2="0" y2="0">
									<stop offset="0%" stopColor="#7a0e0e" />{/* dark red */}
									<stop offset="35%" stopColor="#d62828" />{/* red */}
									<stop offset="65%" stopColor="#f77f00" />{/* orange */}
									<stop offset="85%" stopColor="#fcbf49" />{/* yellow */}
									<stop offset="100%" stopColor="#fff6e7" />{/* near-white */}
								</linearGradient>
							</defs>
							<ReferenceLine
								y={avg}
								stroke="url(#avg-stroke)"
								strokeDasharray="4 4"
								label={{
									position: "right",
									value: "avg",
									fill: "rgba(255,255,255,0.9)",
									fontSize: 10,
								}}
							/>
							<defs>
								<linearGradient id="avg-stroke" x1="0" y1="0" x2="1" y2="0">
									<stop offset="0%" stopColor="rgba(255,200,120,0.0)" />
									<stop offset="50%" stopColor="rgba(255,200,120,0.9)" />
									<stop offset="100%" stopColor="rgba(255,200,120,0.0)" />
								</linearGradient>
							</defs>

							<Bar
								dataKey="value"
								shape={<HeatBar />}
								isAnimationActive
								animationBegin={120}
								animationDuration={650}
								activeBar={<HeatBar active />}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>

			<style jsx>{`
				@keyframes steam {
					0% { opacity: 0.0; transform: translateY(0) scaleX(1); }
					50% { opacity: 0.25; transform: translateY(-8px) scaleX(1.08); }
					100% { opacity: 0.0; transform: translateY(-16px) scaleX(1.12); }
				}
				@keyframes pulseGlow {
					0%, 100% { opacity: 0.65; }
					50% { opacity: 1; }
				}
			`}</style>
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

// Custom tick that renders avatar + name under each bar
function AvatarTick(props: any) {
	const { x, y, payload, avatarMap } = props as { x: number; y: number; payload: any; avatarMap: Map<string, string> }
	const name = payload?.value as string
	const avatar = avatarMap.get(name) ?? ""
	return (
		<g transform={`translate(${x},${y})`}>
			<image
				x={-12}
				y={6}
				width={24}
				height={24}
				href={avatar}
				clipPath="url(#avatar-clip)"
				preserveAspectRatio="xMidYMid slice"
				style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
			/>
			<text dy={38} textAnchor="middle" fill="rgba(255,255,255,0.85)" style={{ fontSize: 11 }}>
				{name}
			</text>

			<defs>
				<clipPath id="avatar-clip">
					<circle cx="0" cy="18" r="12" />
				</clipPath>
			</defs>
		</g>
	)
}

// Custom heat pillar bar shape with glow and hover steam
function HeatBar(props: any) {
	const { x, y, width, height, payload, active } = props as {
		x: number
		y: number
		width: number
		height: number
		payload: any
		active?: boolean
	}
	const radius = Math.min(14, Math.max(10, width * 0.4))
	const glow = 6 + payload.intensity * 10 // blur radius for glow ellipse
	const glowOpacity = 0.35 + payload.intensity * 0.45

	// optional subtle pulse based on minutes
	const pulseOpacity = 0.6 + (payload.totalMinutes / 60) * 0.2

	const topCx = x + width / 2
	const topCy = y - 4

	return (
		<g className="group cursor-pointer">
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				rx={radius}
				fill="url(#heat-gradient)"
			/>
			{/* Top glow */}
			<ellipse
				cx={topCx}
				cy={y}
				rx={Math.max(radius * 0.9, width * 0.4)}
				ry={radius * 0.55}
				fill="rgba(255,230,180,1)"
				style={{
					filter: `blur(${glow}px)`,
					opacity: glowOpacity,
					transformOrigin: `${topCx}px ${y}px`,
					animation: active ? "pulseGlow 1.8s ease-in-out infinite" : undefined,
				}}
			/>
			{/* Steam shimmer on hover */}
			<ellipse
				cx={topCx}
				cy={topCy}
				rx={radius * 0.7}
				ry={radius * 0.35}
				fill="rgba(255,255,255,0.6)"
				className="opacity-0 group-hover:opacity-70"
				style={{
					filter: `blur(${glow + 2}px)`,
					animation: "steam 1.6s ease-in-out infinite",
				}}
			/>
			{/* Inner highlight for cylinder effect */}
			<rect
				x={x + width * 0.18}
				y={y + 6}
				width={Math.max(2, width * 0.22)}
				height={Math.max(0, height - 12)}
				rx={radius}
				fill="rgba(255,255,255,0.18)"
				style={{ opacity: pulseOpacity }}
			/>
		</g>
	)
}

function HeatTooltip(props: any) {
	const { active, payload, label } = props as { active?: boolean; payload?: any[]; label?: string }
	if (!active || !payload || payload.length === 0) return null
	const row = payload[0]?.payload
	return (
		<div
			className="surface-glass px-3 py-2 text-xs"
		>
			<div className="mb-2 flex items-center gap-2">
				<Avatar className="h-6 w-6 ring-1 ring-white/10">
					<AvatarImage src={row.avatar} alt={label} />
					<AvatarFallback>{(label as string)?.slice(0, 2)?.toUpperCase()}</AvatarFallback>
				</Avatar>
				<div className="font-medium">{label}</div>
			</div>
			<div className="grid grid-cols-1 gap-1">
				<div className="flex items-center justify-between">
					<span className="text-white/70">Streak</span>
					<span>{row.streak} days</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-white/70">Minutes</span>
					<span>{row.totalMinutes} min</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-white/70">Max Temp</span>
					<span>{row.maxTemp}°C</span>
				</div>
			</div>
		</div>
	)
}


