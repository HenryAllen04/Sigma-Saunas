import { NextRequest, NextResponse } from "next/server";
import { getHarviaClient } from "@/lib/harvia-client";

/**
 * GET /api/sensor/events
 * Retrieve device events and alerts
 * Query parameters:
 * - startTimestamp (optional) - Default: 7 days ago
 * - endTimestamp (optional) - Default: now
 * - nextToken (optional) - Pagination token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Default to last 7 days
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startTimestamp = searchParams.get("startTimestamp") || startTime.toISOString();
    const endTimestamp = searchParams.get("endTimestamp") || endTime.toISOString();
    const nextToken = searchParams.get("nextToken") || undefined;

    const client = getHarviaClient();
    const data = await client.getEvents(
      startTimestamp,
      endTimestamp,
      nextToken
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
