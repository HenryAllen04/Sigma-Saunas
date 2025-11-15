import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis-client';
import { WearableData, WearableDataUpdate } from '@/types/sensor';

const REDIS_KEY = 'wearable:current';

/**
 * GET /api/wearable/data
 * Retrieves the current wearable data from Redis
 */
export async function GET() {
  try {
    const redis = getRedisClient();
    const data = await redis.get<WearableData>(REDIS_KEY);

    // Return default null values if no data exists
    if (!data) {
      return NextResponse.json({
        heartRate: null,
        hrv: null,
        respiratoryRate: null,
        lastUpdated: null,
      } as WearableData);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching wearable data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wearable data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wearable/data
 * Updates the current wearable data in Redis
 * Supports partial updates - only provided fields will be updated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate that at least one metric is provided
    if (
      body.heartRate === undefined &&
      body.hrv === undefined &&
      body.respiratoryRate === undefined
    ) {
      return NextResponse.json(
        { error: 'At least one metric (heartRate, hrv, respiratoryRate) must be provided' },
        { status: 400 }
      );
    }

    // Validate numeric values
    const update: WearableDataUpdate = {};

    if (body.heartRate !== undefined) {
      if (typeof body.heartRate !== 'number' || body.heartRate < 0) {
        return NextResponse.json(
          { error: 'heartRate must be a positive number' },
          { status: 400 }
        );
      }
      update.heartRate = body.heartRate;
    }

    if (body.hrv !== undefined) {
      if (typeof body.hrv !== 'number' || body.hrv < 0) {
        return NextResponse.json(
          { error: 'hrv must be a positive number' },
          { status: 400 }
        );
      }
      update.hrv = body.hrv;
    }

    if (body.respiratoryRate !== undefined) {
      if (typeof body.respiratoryRate !== 'number' || body.respiratoryRate < 0) {
        return NextResponse.json(
          { error: 'respiratoryRate must be a positive number' },
          { status: 400 }
        );
      }
      update.respiratoryRate = body.respiratoryRate;
    }

    const redis = getRedisClient();

    // Get existing data for partial updates
    const existingData = await redis.get<WearableData>(REDIS_KEY) || {
      heartRate: null,
      hrv: null,
      respiratoryRate: null,
      lastUpdated: null,
    };

    // Merge updates with existing data
    const updatedData: WearableData = {
      heartRate: update.heartRate !== undefined ? update.heartRate : existingData.heartRate,
      hrv: update.hrv !== undefined ? update.hrv : existingData.hrv,
      respiratoryRate: update.respiratoryRate !== undefined ? update.respiratoryRate : existingData.respiratoryRate,
      lastUpdated: new Date().toISOString(),
    };

    // Save to Redis
    await redis.set(REDIS_KEY, updatedData);

    return NextResponse.json({
      success: true,
      data: updatedData,
    });
  } catch (error) {
    console.error('Error updating wearable data:', error);

    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update wearable data' },
      { status: 500 }
    );
  }
}
