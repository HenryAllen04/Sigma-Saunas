import { getHarviaClient } from "@/lib/harvia-client";
import { NextResponse } from "next/server";

/**
 * GET /api/sensor/current
 * Returns the latest sensor data (temperature, humidity, presence)
 */
export async function GET() {
  try {
    const client = getHarviaClient();
    const data = await client.getLatestData();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching current sensor data:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch sensor data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
