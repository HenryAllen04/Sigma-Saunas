import { NextResponse } from "next/server";
import { getHarviaClient } from "@/lib/harvia-client";
import { DeviceHealth } from "@/types/sensor";

/**
 * GET /api/sensor/health
 * Get device health metrics extracted from latest sensor data
 * Returns battery, WiFi signal, connection status, etc.
 */
export async function GET() {
  try {
    const client = getHarviaClient();
    const latestData = await client.getLatestData();

    // Extract health-related fields from sensor data
    const health: DeviceHealth = {
      deviceId: latestData.deviceId,
      timestamp: latestData.timestamp,
      batteryVoltage: latestData.data.batteryVoltage,
      batteryLoadV: latestData.data.batteryLoadV,
      rssi: latestData.data.rssi,
      tempEsp: latestData.data.tempEsp,
      targetTemp: latestData.data.targetTemp,
      saunaStatus: latestData.data.saunaStatus,
      timeToTarget: latestData.data.timeToTarget,
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Error fetching device health:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch device health",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
