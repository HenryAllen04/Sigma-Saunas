"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { EmberGlow } from "@/components/ui/ember-glow";
import { Thermometer, Clock, Droplets, TrendingUp, Calendar } from "lucide-react";
 
import { useEffect, useState } from "react";
import { Session } from "@/types/sensor";

export default function Page() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sessions data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/sensor/sessions");
        if (!response.ok) throw new Error("Failed to fetch sessions");
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Helper: Format duration in milliseconds to HH:MM
  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "--";
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate stats
  const totalDuration = sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);
  const totalMinutes = Math.floor(totalDuration / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;
  const avgMinutes = Math.floor(avgDuration / (1000 * 60));
  const avgHours = Math.floor(avgMinutes / 60);
  const avgRemainingMinutes = avgMinutes % 60;

  // Calculate max temp across all sessions
  const maxTemp = sessions.reduce((max, session) => {
    const stats = session.stats ? JSON.parse(session.stats as string) : {};
    const temp = stats.temp?.max || 0;
    return temp > max ? temp : max;
  }, 0);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="">
        <header className="flex h-20 shrink-0 items-center">
          <div className="flex w-full items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-2" />
              <div className="hidden md:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Session History
                </h1>
                <p className="text-sm text-white/60">Review your past sessions</p>
              </div>
            </div>
            
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 px-6 md:px-12 pb-10">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <EmberGlow>
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">Total Sessions</p>
                    <p className="text-3xl font-bold mt-2">{sessions.length}</p>
                  </div>
                  <Calendar className="h-5 w-5 text-white/40" />
                </div>
              </GlassCard>
            </EmberGlow>

            <EmberGlow>
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">Total Time</p>
                    <p className="text-3xl font-bold mt-2">
                      {totalHours}h {totalMinutes % 60}m
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-white/40" />
                </div>
              </GlassCard>
            </EmberGlow>

            <EmberGlow>
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">Avg Duration</p>
                    <p className="text-3xl font-bold mt-2">
                      {avgHours > 0 ? `${avgHours}h ${avgRemainingMinutes}m` : `${avgRemainingMinutes}m`}
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-white/40" />
                </div>
              </GlassCard>
            </EmberGlow>

            <EmberGlow>
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">Max Temp</p>
                    <p className="text-3xl font-bold mt-2">{maxTemp.toFixed(0)}°C</p>
                  </div>
                  <Thermometer className="h-5 w-5 text-white/40" />
                </div>
              </GlassCard>
            </EmberGlow>
          </div>

          {/* Sessions List */}
          <EmberGlow>
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Sessions</h2>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-white/40">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-white/40">No sessions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const stats = session.stats ? JSON.parse(session.stats as string) : {};
                    const sessionDate = new Date(session.timestamp);

                    return (
                      <div
                        key={session.sessionId}
                        className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">
                                {sessionDate.toLocaleDateString([], {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </h3>
                              <span className="text-sm text-white/50">
                                {sessionDate.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-white/40" />
                                <div>
                                  <p className="text-xs text-white/50">Duration</p>
                                  <p className="text-sm font-medium">
                                    {formatDuration(session.durationMs)}
                                  </p>
                                </div>
                              </div>

                              {stats.temp && (
                                <div className="flex items-center gap-2">
                                  <Thermometer className="h-4 w-4 text-white/40" />
                                  <div>
                                    <p className="text-xs text-white/50">Temperature</p>
                                    <p className="text-sm font-medium">
                                      {stats.temp.avg?.toFixed(1)}°C avg
                                      {stats.temp.max && (
                                        <span className="text-white/50 ml-1">
                                          ({stats.temp.max.toFixed(0)}°C max)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {stats.hum && (
                                <div className="flex items-center gap-2">
                                  <Droplets className="h-4 w-4 text-white/40" />
                                  <div>
                                    <p className="text-xs text-white/50">Humidity</p>
                                    <p className="text-sm font-medium">
                                      {stats.hum.avg?.toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </EmberGlow>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


