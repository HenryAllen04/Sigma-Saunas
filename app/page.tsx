"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GlassCard } from "@/components/ui/glass-card";
import { EmberGlow } from "@/components/ui/ember-glow";
import { Thermometer, Droplets, User, Sparkles, Activity } from "lucide-react";
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
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4" />
              Profile
            </Link>
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
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isConnected ? "bg-green-400" : "bg-red-400"
                      }`}
                    />
                    <span className="text-sm text-white/60">
                      {isConnected ? "Live" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </EmberGlow>

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
