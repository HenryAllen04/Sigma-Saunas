"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GlassCard } from "@/components/ui/glass-card";
import { EmberGlow } from "@/components/ui/ember-glow";
import { Thermometer, Droplets, User, Activity, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LatestDataResponse,
  TelemetryHistoryResponse,
  TelemetryMeasurement,
  Session,
} from "@/types/sensor";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Page() {
  const [sensorData, setSensorData] = useState<LatestDataResponse | null>(null);
  const [historyData, setHistoryData] = useState<TelemetryMeasurement[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch historical data
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/sensor/history");
        if (!response.ok) throw new Error("Failed to fetch history");
        const data: TelemetryHistoryResponse = await response.json();
        setHistoryData(data.measurements || []);
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    fetchHistory();
  }, []);

  // Fetch sessions data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch("/api/sensor/sessions");
        if (!response.ok) throw new Error("Failed to fetch sessions");
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchSessions();
  }, []);

  // Connect to SSE stream for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/sensor/stream");

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: LatestDataResponse = JSON.parse(event.data);
        if (!("error" in data)) {
          setSensorData(data);
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  // Format chart data
  const formatChartData = (data: TelemetryMeasurement[]) => {
    return data.map((item) => ({
      time: new Date(parseInt(item.timestamp)).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: item.data?.temp,
      humidity: item.data?.hum,
    }));
  };

  // Helper: Format duration in milliseconds to HH:MM
  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "--";
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate weekly total from sessions
  const weeklyTotal = sessions.reduce((acc, session) => acc + (session.durationMs || 0), 0);
  const weeklyMinutes = Math.floor(weeklyTotal / (1000 * 60));

  // Calculate daily session data for the last 7 days
  const getDailySessionData = () => {
    const today = new Date();
    const dailyData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      const dayTotal = sessions
        .filter((session) => {
          const sessionDate = new Date(session.timestamp);
          return sessionDate >= targetDate && sessionDate < nextDate;
        })
        .reduce((acc, session) => acc + (session.durationMs || 0), 0);

      // Convert to minutes
      dailyData.push(Math.floor(dayTotal / (1000 * 60)));
    }

    return dailyData;
  };

  const dailySessionMinutes = getDailySessionData();
  const maxDailyMinutes = Math.max(...dailySessionMinutes, 1); // Avoid division by zero

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center">
          <div className="flex w-full items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-2" />
              <div className="hidden md:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Good evening, Perttu
                </h1>
                <p className="text-sm text-white/60">Ready for a session?</p>
              </div>
            </div>
            
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 px-6 md:px-12 pb-10">
          {/* Live Status Card */}
          <EmberGlow className="mt-2 w-full">
            <GlassCard className="p-6 md:p-10">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-4xl font-bold">
                      <Thermometer className="h-8 w-8 text-white/70" />
                      <span className="drop-shadow-[0_0_20px_rgba(255,200,60,0.35)]">
                        {sensorData?.data?.temp !== undefined
                          ? `${sensorData.data.temp.toFixed(1)}°C`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-2xl font-semibold text-white/80">
                      <Droplets className="h-6 w-6 text-white/60" />
                      <span>
                        {sensorData?.data?.hum !== undefined
                          ? `${sensorData.data.hum.toFixed(1)}%`
                          : "--"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <User
                      className={`h-5 w-5 ${
                        sensorData?.data?.presence && sensorData.data.presence > 0
                          ? "text-green-300/80"
                          : "text-white/40"
                      }`}
                    />
                    <span>
                      {sensorData?.data?.presence !== undefined
                        ? sensorData.data.presence > 0
                          ? "Someone present"
                          : "No one present"
                        : "--"}
                    </span>
                  </div>
                </div>
                <div className="flex md:justify-end">
                  <Link
                    href="#"
                    className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/25 backdrop-blur-md"
                  >
                    Start Session
                  </Link>
                </div>
              </div>
            </GlassCard>
          </EmberGlow>

          {/* Heart rate pill */}
          <EmberGlow className="rounded-full w-fit">
            <GlassCard className="rounded-full px-5 py-3">
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-rose-300" />
                <span className="text-sm">72 bpm</span>
                <span className="mx-2 text-white/30">•</span>
                <span className="text-sm text-white/80">Resting</span>
              </div>
            </GlassCard>
          </EmberGlow>

          {/* Lower grid: Weekly Progress & Insight */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Weekly Progress */}
            <EmberGlow className="md:col-span-2">
              <GlassCard className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-medium">Sauna Time This Week</h3>
                  <span className="text-sm text-white/60">{weeklyMinutes} minutes • +12%</span>
                </div>
                {/* Daily session bar chart */}
                <div className="grid grid-cols-7 gap-2 pt-2">
                  {dailySessionMinutes.map((minutes, i) => {
                    const heightPercent = maxDailyMinutes > 0 ? (minutes / maxDailyMinutes) * 100 : 0;
                    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const today = new Date();
                    const dayIndex = (today.getDay() - 6 + i + 7) % 7;

                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="relative h-24 w-full overflow-hidden rounded-md bg-white/5">
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-amber-400/70 to-amber-200/30"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50">{dayLabels[dayIndex]}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </EmberGlow>

            {/* AI Coach */}
            <EmberGlow>
              <GlassCard className="p-5">
                <h3 className="mb-2 text-base font-medium">Insight of the Day</h3>
                <p className="text-sm text-white/80">
                  Your HRV improved after yesterday's session. A gentle 12-minute
                  zen heat today would help recovery.
                </p>
              </GlassCard>
            </EmberGlow>
          </div>

          {/* Lower grid: Chart & Sessions */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Historical Chart */}
            <EmberGlow className="md:col-span-2">
              <GlassCard className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Last 24 Hours</h3>
                    <p className="text-sm text-white/60">Temperature & humidity</p>
                  </div>
                  <Activity className="h-5 w-5 text-white/40" />
                </div>
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={formatChartData(historyData)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                        stroke="rgba(255,255,255,0.2)"
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="temp"
                        orientation="left"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                        stroke="rgba(255,255,255,0.2)"
                      />
                      <YAxis
                        yAxisId="humidity"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                        stroke="rgba(255,255,255,0.2)"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0,0,0,0.8)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "rgba(255,255,255,0.8)" }} />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#ff9a1f"
                        name="Temperature (°C)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="humidity"
                        type="monotone"
                        dataKey="humidity"
                        stroke="#60a5fa"
                        name="Humidity (%)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-white/40">
                    <p className="text-sm">Loading data...</p>
                  </div>
                )}
              </GlassCard>
            </EmberGlow>

            {/* Sessions Summary */}
            <EmberGlow>
              <GlassCard className="p-5">
                <h3 className="mb-2 text-base font-medium">This Week</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">{weeklyMinutes} min</p>
                    <p className="text-sm text-white/60">{sessions.length} sessions</p>
                  </div>
                  {sessions.slice(0, 3).map((session) => {
                    const stats = session.stats ? JSON.parse(session.stats as string) : {};
                    return (
                      <div
                        key={session.sessionId}
                        className="border-t border-white/10 pt-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/80">
                            {formatDuration(session.durationMs)}
                          </span>
                          {stats.temp && (
                            <span className="text-sm text-white/60">
                              {stats.temp.max?.toFixed(0)}°C
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                          {new Date(session.timestamp).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </EmberGlow>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
