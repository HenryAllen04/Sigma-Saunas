"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import {
  LatestDataResponse,
  TelemetryHistoryResponse,
  TelemetryMeasurement,
  Session,
  DeviceHealth,
  DeviceEvent,
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
import {
  Activity,
  Droplets,
  Thermometer,
  User,
  Battery,
  Wifi,
  Cpu,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle
} from "lucide-react";

export default function Page() {
  const [sensorData, setSensorData] = useState<LatestDataResponse | null>(
    null
  );
  const [historyData, setHistoryData] = useState<TelemetryMeasurement[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for Phase 2
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth | null>(null);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);

  // Fetch historical data
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Get last 24 hours of data
        const response = await fetch("/api/sensor/history");
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const data: TelemetryHistoryResponse = await response.json();
        setHistoryData(data.measurements || []);
      } catch (err) {
        console.error("Error fetching history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      }
    };

    fetchHistory();
  }, []);

  // Fetch sessions data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch("/api/sensor/sessions");
        if (!response.ok) {
          throw new Error("Failed to fetch sessions");
        }
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };

    fetchSessions();
  }, []);

  // Fetch events data
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/sensor/events");
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    };

    fetchEvents();
  }, []);

  // Fetch device health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/sensor/health");
        if (!response.ok) {
          throw new Error("Failed to fetch health");
        }
        const data: DeviceHealth = await response.json();
        setDeviceHealth(data);
      } catch (err) {
        console.error("Error fetching health:", err);
      }
    };

    fetchHealth();
  }, []);

  // Connect to SSE stream for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/sensor/stream");

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: LatestDataResponse = JSON.parse(event.data);
        if ("error" in data) {
          setError((data as { error: string }).error);
        } else {
          setSensorData(data);
          setError(null);

          // Update health data from sensor data
          setDeviceHealth({
            deviceId: data.deviceId,
            timestamp: data.timestamp,
            batteryVoltage: data.data.batteryVoltage,
            batteryLoadV: data.data.batteryLoadV,
            rssi: data.data.rssi,
            tempEsp: data.data.tempEsp,
            targetTemp: data.data.targetTemp,
            saunaStatus: data.data.saunaStatus,
            timeToTarget: data.data.timeToTarget,
          });
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setIsConnected(false);
      setError("Connection to sensor stream lost");
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  // Format timestamp for chart
  const formatChartData = (data: TelemetryMeasurement[]) => {
    return data.map((item) => ({
      time: new Date(parseInt(item.timestamp)).toLocaleTimeString(),
      temperature: item.data?.temp,
      humidity: item.data?.hum,
      presence: item.data?.presence,
    }));
  };

  // Helper: Format duration in milliseconds to HH:MM
  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "--";
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Helper: Get WiFi signal quality from RSSI
  const getWifiQuality = (rssi?: number) => {
    if (!rssi) return { text: "Unknown", color: "text-gray-400" };
    if (rssi >= -50) return { text: "Excellent", color: "text-green-500" };
    if (rssi >= -60) return { text: "Very Good", color: "text-green-400" };
    if (rssi >= -70) return { text: "Good", color: "text-yellow-500" };
    if (rssi >= -80) return { text: "Fair", color: "text-orange-500" };
    return { text: "Poor", color: "text-red-500" };
  };

  // Helper: Get battery percentage estimate (10-11V range)
  const getBatteryPercentage = (voltage?: number) => {
    if (!voltage) return "--";
    const minV = 10.0;
    const maxV = 11.0;
    const percentage = Math.round(((voltage - minV) / (maxV - minV)) * 100);
    return Math.min(Math.max(percentage, 0), 100);
  };

  // Helper: Format event timestamp
  const formatEventTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  // Helper: Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "HIGH": return "text-red-500";
      case "MEDIUM": return "text-yellow-500";
      case "LOW": return "text-green-500";
      default: return "text-gray-500";
    }
  };

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
                  <BreadcrumbLink href="#">Sauna Monitor</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Live Sensors</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {/* Device Health Panel */}
          <div className="ml-auto px-4">
            <div className="flex items-center gap-4">
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {/* Health metrics */}
              {deviceHealth && (
                <div className="flex items-center gap-3 border-l pl-4">
                  {/* Battery */}
                  <div className="flex items-center gap-1.5">
                    <Battery className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {getBatteryPercentage(deviceHealth.batteryVoltage)}%
                    </span>
                  </div>

                  {/* WiFi */}
                  <div className="flex items-center gap-1.5">
                    <Wifi className={`h-4 w-4 ${getWifiQuality(deviceHealth.rssi).color}`} />
                    <span className={`text-sm ${getWifiQuality(deviceHealth.rssi).color}`}>
                      {getWifiQuality(deviceHealth.rssi).text}
                    </span>
                  </div>

                  {/* ESP Temperature */}
                  {deviceHealth.tempEsp && deviceHealth.tempEsp > 60 && (
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-500">
                        {deviceHealth.tempEsp}°C
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Error banner */}
          {error && (
            <div className="rounded-lg bg-destructive/15 p-4 text-destructive">
              <p className="text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* Sensor cards */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/* Temperature card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Temperature
                  </p>
                  <p className="text-3xl font-bold">
                    {sensorData?.data?.temp !== undefined
                      ? `${sensorData.data.temp.toFixed(1)}°C`
                      : "--"}
                  </p>
                </div>
                <Thermometer className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            {/* Humidity card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Humidity
                  </p>
                  <p className="text-3xl font-bold">
                    {sensorData?.data?.hum !== undefined
                      ? `${sensorData.data.hum.toFixed(1)}%`
                      : "--"}
                  </p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Presence card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Motion
                  </p>
                  <p className="text-3xl font-bold">
                    {sensorData?.data?.presence !== undefined
                      ? sensorData.data.presence > 0
                        ? "Detected"
                        : "None"
                      : "--"}
                  </p>
                  {sensorData?.data?.presence !== undefined &&
                    sensorData.data.presence > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Level: {sensorData.data.presence}
                      </p>
                    )}
                </div>
                <User
                  className={`h-8 w-8 ${
                    sensorData?.data?.presence && sensorData.data.presence > 0
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Session History */}
          {sessions.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Session History</h3>
                <p className="text-sm text-muted-foreground">
                  Recent sauna sessions (last 7 days)
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {sessions.slice(0, 4).map((session) => {
                  const stats = session.stats ? JSON.parse(session.stats as string) : {};
                  return (
                    <div
                      key={session.sessionId}
                      className="rounded-lg border bg-card/50 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {new Date(session.timestamp).toLocaleDateString()} at{" "}
                          {new Date(session.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-2xl font-bold">
                          {formatDuration(session.durationMs)}
                        </div>

                        {stats.temp && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Max temp:</span>
                            <span className="font-medium">
                              {stats.temp.max?.toFixed(1)}°C
                            </span>
                          </div>
                        )}

                        {stats.temp && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avg temp:</span>
                            <span className="font-medium">
                              {stats.temp.avg?.toFixed(1)}°C
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historical data chart */}
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sensor History</h3>
                <p className="text-sm text-muted-foreground">
                  Last 24 hours of temperature and humidity data
                </p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>

            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formatChartData(historyData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f97316"
                    name="Temperature (°C)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="humidity"
                    type="monotone"
                    dataKey="humidity"
                    stroke="#3b82f6"
                    name="Humidity (%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                <p>Loading historical data...</p>
              </div>
            )}
          </div>

          {/* Events Timeline */}
          {events.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="w-full flex items-center justify-between mb-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-left">
                    Events & Alerts ({events.length})
                  </h3>
                  <p className="text-sm text-muted-foreground text-left">
                    Device events from the last 7 days
                  </p>
                </div>
                {showEvents ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {showEvents && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.slice(0, 10).map((event, index) => (
                    <div
                      key={`${event.deviceId}-${event.timestamp}-${index}`}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
                    >
                      <AlertCircle
                        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getSeverityColor(
                          event.severity
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">
                            {event.displayName || event.eventId}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatEventTime(event.timestamp)}
                          </span>
                        </div>

                        {event.metadata && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.metadata}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              event.type === "SENSOR"
                                ? "border-blue-500/50 text-blue-500"
                                : "border-gray-500/50 text-gray-500"
                            }`}
                          >
                            {event.type}
                          </span>
                          {event.severity && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(
                                event.severity
                              )}`}
                            >
                              {event.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Last updated */}
          {sensorData?.timestamp && (
            <div className="text-center text-sm text-muted-foreground">
              Last updated: {new Date(parseInt(sensorData.timestamp)).toLocaleString()}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
