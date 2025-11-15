"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GlassCard } from "@/components/ui/glass-card";
import { EmberGlow } from "@/components/ui/ember-glow";
import { Thermometer, Droplets, User, Activity, Heart, Mic, Square, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo, memo } from "react";
import {
  LatestDataResponse,
  TelemetryHistoryResponse,
  TelemetryMeasurement,
  Session,
  WearableData,
} from "@/types/sensor";
import { Button } from "@/components/ui/button";
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

// Memoized chart component to prevent re-renders when parent updates
const HistoricalChart = memo(({ data }: { data: Array<{ time: string; temperature?: number; humidity?: number }> }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-white/40">
        <p className="text-sm">Loading data...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
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
  );
});

HistoricalChart.displayName = 'HistoricalChart';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Page() {
  const [sensorData, setSensorData] = useState<LatestDataResponse | null>(null);
  const [historyData, setHistoryData] = useState<TelemetryMeasurement[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Voice agent state
  const [sessionActive, setSessionActive] = useState(false);
  const [wearableData, setWearableData] = useState<WearableData | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [lastGuidance, setLastGuidance] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs for voice agent
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saunaStreamRef = useRef<EventSource | null>(null);
  const recognitionRef = useRef<any>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const shouldListenRef = useRef<boolean>(false);
  const wearableDataRef = useRef<WearableData | null>(null);
  const sensorDataRef = useRef<LatestDataResponse | null>(null);
  const sessionDurationRef = useRef<number>(0);

  // Fetch wearable data
  useEffect(() => {
    const fetchWearableData = async () => {
      try {
        const response = await fetch("/api/wearable/data");
        if (!response.ok) throw new Error("Failed to fetch wearable data");
        const data: WearableData = await response.json();
        setWearableData(data);
        wearableDataRef.current = data;
      } catch (err) {
        console.error("Error fetching wearable data:", err);
      }
    };
    fetchWearableData();

    // Poll for wearable data updates every 5 seconds
    const interval = setInterval(fetchWearableData, 5000);
    return () => clearInterval(interval);
  }, []);

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
          sensorDataRef.current = data;
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

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (!shouldListenRef.current) return;
        if (!transcript || transcript.length < 3) return;

        console.log("Heard:", transcript);

        const userMessage: Message = {
          role: "user",
          content: transcript,
          timestamp: new Date(),
        };
        setConversation((prev) => [...prev, userMessage]);
        await handleUserQuestion(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (shouldListenRef.current && event.error !== "aborted") {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started
              }
            }
          }, 1000);
        }
      };

      recognitionRef.current.onend = () => {
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (e) {
                // Already started
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
    }
  }, []);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionDuration((prev) => {
          const newDuration = prev + 1;
          sessionDurationRef.current = newDuration;
          return newDuration;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Format chart data - memoized to prevent re-rendering on every sensorData update
  const chartData = useMemo(() => {
    return historyData.map((item) => ({
      time: new Date(parseInt(item.timestamp)).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: item.data?.temp,
      humidity: item.data?.hum,
    }));
  }, [historyData]);

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

  // Voice agent functions
  const generateGuidance = (wearable: WearableData, sensor: LatestDataResponse, duration: number): string => {
    // Safety thresholds
    if (wearable.heartRate && wearable.heartRate > 120) {
      return `Your heart rate is ${wearable.heartRate} beats per minute, which is quite elevated. Consider taking a break and cooling down for your safety.`;
    }

    if (sensor.data.temp && sensor.data.temp > 85) {
      return `The sauna temperature is now ${sensor.data.temp.toFixed(1)} degrees Celsius. This is getting quite hot. Make sure you're staying hydrated.`;
    }

    // Duration-based guidance
    if (duration === 0) {
      return `Welcome to your sauna session. The temperature is ${sensor.data.temp?.toFixed(1) || 'unknown'} degrees with ${sensor.data.hum?.toFixed(1) || 'unknown'} percent humidity. Your current heart rate is ${wearable.heartRate || 'unknown'}. Take slow, deep breaths and relax.`;
    }

    if (duration === 60) {
      return `You've been in the sauna for one minute. Your heart rate is ${wearable.heartRate || 'unknown'}. Remember to focus on your breathing and stay present.`;
    }

    if (duration === 180) {
      return `Three minutes in. You're doing great. Your heart rate has ${wearable.heartRate ? `increased to ${wearable.heartRate}` : 'changed'}, which is normal. The sauna is at ${sensor.data.temp?.toFixed(1) || 'unknown'} degrees.`;
    }

    if (duration === 300) {
      return `Five minutes complete. Consider doing some gentle stretches if you feel comfortable. Your heart rate is ${wearable.heartRate || 'unknown'}.`;
    }

    if (duration === 600) {
      return `You've completed 10 minutes. This is an excellent session length for recovery. ${wearable.hrv ? `Your HRV is ${wearable.hrv}.` : ''} You can continue or begin your cool-down when ready.`;
    }

    if (duration === 900) {
      return `Fifteen minutes is a substantial session. Your heart rate is ${wearable.heartRate || 'unknown'}. Consider finishing up and moving to the cool-down phase.`;
    }

    return "";
  };

  const speakGuidance = async (text: string) => {
    if (!text) return;

    try {
      setLastGuidance(text);
      setIsSpeaking(true);

      if (recognitionRef.current && shouldListenRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }

      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error("Failed to generate speech");
        setIsSpeaking(false);
        if (recognitionRef.current && shouldListenRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          if (recognitionRef.current && shouldListenRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started
              }
            }, 500);
          }
        };

        audioRef.current.play();
      }
    } catch (error) {
      console.error("Error speaking guidance:", error);
      setIsSpeaking(false);
      if (recognitionRef.current && shouldListenRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
    }
  };

  const handleUserQuestion = async (question: string) => {
    console.log("🎤 Processing question:", question);

    const currentWearableData = wearableDataRef.current;
    const currentSensorData = sensorDataRef.current;
    const currentDuration = sessionDurationRef.current;

    if (!currentWearableData || !currentSensorData) {
      console.error("❌ No wearable or sensor data available");
      return;
    }

    setIsProcessing(true);

    if (recognitionRef.current && shouldListenRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          healthData: {
            heartRate: currentWearableData.heartRate,
            hrv: currentWearableData.hrv,
            respiratoryRate: currentWearableData.respiratoryRate,
          },
          saunaData: {
            temperature: currentSensorData.data.temp,
            humidity: currentSensorData.data.hum,
            presence: currentSensorData.data.presence === 1,
          },
          sessionDuration: currentDuration,
        }),
      });

      if (!response.ok) {
        console.error("❌ Failed to get AI response");
        setIsProcessing(false);
        if (recognitionRef.current && shouldListenRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started
            }
          }, 500);
        }
        return;
      }

      const data = await response.json();
      const aiResponse = data.response;

      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setConversation((prev) => [...prev, assistantMessage]);

      setIsProcessing(false);
      await speakGuidance(aiResponse);
    } catch (error) {
      console.error("❌ Error processing question:", error);
      setIsProcessing(false);
      if (recognitionRef.current && shouldListenRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }, 500);
      }
    }
  };

  const startSession = () => {
    setSessionActive(true);
    setSessionDuration(0);
    shouldListenRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition:", e);
      }
    }

    // Initial guidance
    if (wearableData && sensorData) {
      speakGuidance(generateGuidance(wearableData, sensorData, 0));
    }
  };

  const stopSession = () => {
    setSessionActive(false);
    setSessionDuration(0);
    shouldListenRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        // Already stopped
      }
    }

    speakGuidance("Session complete. Great work! Remember to rehydrate and cool down gradually.");
  };

  // Periodic guidance during session
  useEffect(() => {
    if (sessionActive && wearableData && sensorData) {
      const guidance = generateGuidance(wearableData, sensorData, sessionDuration);
      if (guidance) {
        speakGuidance(guidance);
      }
    }
  }, [sessionDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

            {/* Heart rate pill */}
            <EmberGlow className="rounded-full">
              <GlassCard className="rounded-full px-5 py-3">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-rose-300" />
                  <span className="text-sm">
                    {wearableData?.heartRate ? `${wearableData.heartRate} bpm` : "-- bpm"}
                  </span>
                  {wearableData?.hrv && (
                    <>
                      <span className="mx-2 text-white/30">•</span>
                      <span className="text-sm text-white/80">HRV: {wearableData.hrv}ms</span>
                    </>
                  )}
                </div>
              </GlassCard>
            </EmberGlow>
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
                  {!sessionActive ? (
                    <Button
                      onClick={startSession}
                      className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/25 backdrop-blur-md border-0"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Session
                    </Button>
                  ) : (
                    <Button
                      onClick={stopSession}
                      variant="outline"
                      className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/15 backdrop-blur-md border-white/20"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Session
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </EmberGlow>

          {/* Lower grid: Weekly Progress & Insight */}
          <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
            {/* Weekly Progress */}
            <EmberGlow className="md:col-span-2">
              <GlassCard className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-medium">Sauna Time This Week</h3>
                  <span className="text-sm text-white/60">{weeklyMinutes} minutes • +12%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-6">
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

                  {/* Sessions Summary */}
                  <div className="space-y-4 border-l border-white/10 pl-6">
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
                </div>
              </GlassCard>
            </EmberGlow>

            {/* AI Coach */}
            <EmberGlow className="flex h-full">
              <GlassCard className="p-5 flex-1 h-full">
                <h3 className="mb-2 text-base font-medium">Insight of the Day</h3>
                <p className="text-sm text-white/80">
                  Your HRV improved after yesterday's session. A gentle 12-minute
                  zen heat today would help recovery.
                </p>
              </GlassCard>
            </EmberGlow>
          </div>

          {/* Historical Chart */}
          <EmberGlow className="w-full">
            <GlassCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">Last 24 Hours</h3>
                  <p className="text-sm text-white/60">Temperature & humidity</p>
                </div>
                <Activity className="h-5 w-5 text-white/40" />
              </div>
              <HistoricalChart data={chartData} />
            </GlassCard>
          </EmberGlow>

          {/* Session controls and conversation */}
          {sessionActive && (
            <>
              <audio ref={audioRef} />

              {/* Session timer */}
              <EmberGlow className="w-fit mx-auto">
                <GlassCard className="px-6 py-4">
                  <div className="text-center">
                    <div className="text-3xl font-mono font-bold tracking-wider">
                      {formatTime(sessionDuration)}
                    </div>
                    <p className="text-xs text-white/50 mt-1">Session Duration</p>
                  </div>
                </GlassCard>
              </EmberGlow>

              {/* Status indicators */}
              <div className="flex justify-center gap-4">
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    AI is speaking...
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Thinking...
                  </div>
                )}
                {!isSpeaking && !isProcessing && isListening && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mic className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-green-400">Listening - speak anytime</span>
                  </div>
                )}
              </div>

              {/* Conversation history */}
              {conversation.length > 0 && (
                <EmberGlow>
                  <GlassCard className="p-6 max-h-96 overflow-y-auto">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Conversation
                    </h3>
                    <div className="space-y-3">
                      {conversation.map((message, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border border-white/10 ${
                            message.role === "user"
                              ? "bg-white/5 ml-8"
                              : "bg-white/10 mr-8"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="font-semibold text-xs text-white/80">
                              {message.role === "user" ? "You" : "AI Coach"}
                            </div>
                            <div className="text-xs text-white/50">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-white/90">
                            {message.content}
                          </p>
                        </div>
                      ))}
                      <div ref={conversationEndRef} />
                    </div>
                  </GlassCard>
                </EmberGlow>
              )}

              {/* Last guidance (shown when no conversation yet) */}
              {lastGuidance && conversation.length === 0 && (
                <EmberGlow>
                  <GlassCard className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4" />
                      Latest Guidance
                    </h3>
                    <p className="text-sm text-white/80">{lastGuidance}</p>
                  </GlassCard>
                </EmberGlow>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
