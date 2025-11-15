# Wearable Data API

Real-time wearable health metrics storage using Redis.

## Endpoints

### GET `/api/wearable/data`
Retrieves the current wearable data.

**Response:**
```json
{
  "heartRate": 85,
  "hrv": 45,
  "respiratoryRate": 16,
  "lastUpdated": "2025-11-15T19:40:14.366Z"
}
```

If no data exists:
```json
{
  "heartRate": null,
  "hrv": null,
  "respiratoryRate": null,
  "lastUpdated": null
}
```

### POST `/api/wearable/data`
Updates wearable data. Supports partial updates.

**Request Body:**
```json
{
  "heartRate": 72,
  "hrv": 45,
  "respiratoryRate": 16
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "heartRate": 72,
    "hrv": 45,
    "respiratoryRate": 16,
    "lastUpdated": "2025-11-15T19:40:05.623Z"
  }
}
```

## curl Examples

```bash
# Get current data
curl http://localhost:31337/api/wearable/data

# Update all metrics
curl -X POST http://localhost:31337/api/wearable/data \
  -H "Content-Type: application/json" \
  -d '{"heartRate": 72, "hrv": 45, "respiratoryRate": 16}'

# Partial update (only heart rate)
curl -X POST http://localhost:31337/api/wearable/data \
  -H "Content-Type: application/json" \
  -d '{"heartRate": 85}'

# Update from wearable device
curl -X POST http://localhost:31337/api/wearable/data \
  -H "Content-Type: application/json" \
  -d '{"hrv": 52}'
```

## Validation

- At least one metric must be provided in POST requests
- All values must be positive numbers
- Invalid requests return 400 status with error message

## Data Storage

- Single Redis key: `wearable:current`
- Only stores the latest reading (no history)
- `lastUpdated` is automatically set server-side on POST
- Partial updates merge with existing data

## Environment Setup

Add to `.env`:
```bash
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```
