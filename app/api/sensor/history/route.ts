import { getHarviaClient } from "@/lib/harvia-client";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sensor/history
 * Returns historical telemetry data
 * Query params:
 * - startTimestamp: ISO 8601 timestamp (default: 24 hours ago)
 * - endTimestamp: ISO 8601 timestamp (default: now)
 * - samplingMode: "average" | "latest" (default: "average")
 * - sampleAmount: number (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Default to last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const startTimestamp =
      searchParams.get("startTimestamp") || startTime.toISOString();
    const endTimestamp =
      searchParams.get("endTimestamp") || endTime.toISOString();
    const samplingMode = searchParams.get("samplingMode") || "average";
    const sampleAmount = parseInt(
      searchParams.get("sampleAmount") || "100",
      10
    );

    const client = getHarviaClient();
    const data = await client.getTelemetryHistory(
      startTimestamp,
      endTimestamp,
      samplingMode,
      sampleAmount
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching sensor history:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch sensor history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
