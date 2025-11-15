# Implementation Notes & Corrections

> ⚠️ **NOTE**: This is NOT official Harvia documentation. This file contains community-contributed corrections, clarifications, and implementation details discovered during development that supplement the official API documentation.

---

## GraphQL Schema Corrections

### Sessions Query (Data Service)

**Official docs say:** `AWSTimestamp!` for timestamp parameters
**Actually works with:** `AWSDateTime!`

**Correct Query:**
```graphql
query DevicesSessionsList(
  $deviceId: String!
  $startTimestamp: AWSDateTime!     # ✅ Use AWSDateTime, not AWSTimestamp
  $endTimestamp: AWSDateTime!       # ✅ Use AWSDateTime, not AWSTimestamp
  $nextToken: String
) {
  devicesSessionsList(
    deviceId: $deviceId
    startTimestamp: $startTimestamp
    endTimestamp: $endTimestamp
    nextToken: $nextToken
  ) {
    sessions {
      deviceId
      sessionId
      timestamp
      durationMs
      stats
    }
    nextToken
  }
}
```

**Variables format:**
```javascript
{
  "deviceId": "a79a22cc-b7cc-4f8b-94ca-9ded3c80242b",
  "startTimestamp": "2025-01-01T00:00:00.000Z",  // ISO 8601 string
  "endTimestamp": "2025-01-08T00:00:00.000Z"     // ISO 8601 string
}
```

---

### Events Query (Events Service)

**Key differences from REST API patterns:**

1. **deviceId type:** `ID!` (not `String!`)
2. **nextToken type:** `ID` (not `String`)
3. **Time range:** Wrapped in a `period` object with `TimePeriod` type
4. **Timestamp format:** Milliseconds as strings (not ISO 8601)

**Correct Query:**
```graphql
query DevicesEventsList(
  $deviceId: ID!              # ✅ ID type, not String
  $period: TimePeriod         # ✅ Wrapped in period object
  $nextToken: ID              # ✅ ID type, not String
) {
  devicesEventsList(
    deviceId: $deviceId
    period: $period
    nextToken: $nextToken
  ) {
    events {
      deviceId
      timestamp
      eventId
      type
      eventState
      severity
      sensorName
      sensorValue
      metadata
      displayName
    }
    nextToken
  }
}
```

**Variables format:**
```javascript
{
  "deviceId": "a79a22cc-b7cc-4f8b-94ca-9ded3c80242b",
  "period": {
    "startTimestamp": "1735689600000",  // ✅ Milliseconds as string
    "endTimestamp": "1735776000000"     // ✅ Milliseconds as string
  }
  // Only include nextToken if you have one from previous response
}
```

**Important:** Don't include `nextToken` in variables if it's `undefined`. The GraphQL schema is strict about type matching.

---

## Data Structure Gotchas

### Session Stats Field

The `stats` field in session responses is **stringified JSON**, not a native object:

```typescript
interface Session {
  stats?: string;  // ⚠️ String, not object!
}

// You must parse it:
const session = await getSessions(...);
const stats = JSON.parse(session.sessions[0].stats);

console.log(stats.temp.avg);  // Now accessible
```

**Stats structure (after parsing):**
```javascript
{
  "temp": {
    "avg": 38.51,
    "min": 23.93,
    "max": 52.56,
    "count": 63,
    "sum": 2426.49
  },
  "hum": { /* same structure */ },
  "rssi": { /* same structure */ },
  "presence": { /* same structure */ }
  // ... other sensor fields
}
```

---

### Telemetry Data Nesting

Latest data and telemetry history have **nested data structure**:

```typescript
// ✅ Correct
interface TelemetryMeasurement {
  timestamp: string;
  data: {              // ⚠️ Nested inside 'data' field
    temp?: number;
    hum?: number;
    presence?: number;
  };
}

// ❌ Wrong - fields are NOT at top level
interface TelemetryMeasurement {
  timestamp: string;
  temp?: number;       // This won't work!
  hum?: number;
}
```

**Usage:**
```typescript
const measurement = await getLatestData();
console.log(measurement.data.temp);  // ✅ Access via .data
console.log(measurement.temp);       // ❌ undefined
```

---

## Health Metrics Extraction

Device health metrics are **embedded in sensor data** from the Data Service REST API. There's no separate health endpoint - you extract it from `/data/latest-data`:

**Available health fields:**
```typescript
{
  batteryVoltage: number;    // e.g., 10.54 (volts)
  batteryLoadV: number;      // Battery voltage under load
  rssi: number;              // WiFi signal strength (dBm), e.g., -89
  tempEsp: number;           // ESP32 chip temperature (°C)
  targetTemp: number;        // Target sauna temperature
  saunaStatus: number;       // Status code (0-3)
  timeToTarget: number;      // Estimated minutes to target temp
  resetCnt: number;          // Device reset counter
  heapSize: number;          // Free heap memory
}
```

**WiFi Signal Quality (RSSI):**
- -50 dBm or higher: Excellent
- -50 to -60 dBm: Very Good
- -60 to -70 dBm: Good
- -70 to -80 dBm: Fair
- -80 dBm or lower: Poor

**Battery Voltage:**
- Typical range: 10.0V - 11.0V (for 3S LiPo/Li-ion)
- Below 10.0V: Low battery warning recommended
- Above 11.0V: Fully charged

---

## Optional Parameters in GraphQL

**Problem:** Sending `undefined` or `null` for optional parameters can cause type validation errors.

**Solution:** Only include optional parameters in variables object if they have a value:

```typescript
// ❌ Can cause errors
const variables = {
  deviceId,
  period: { ... },
  nextToken: undefined  // Type error!
};

// ✅ Correct approach
const variables: Record<string, unknown> = {
  deviceId,
  period: { ... }
};

if (nextToken) {
  variables.nextToken = nextToken;
}
```

---

## Common Implementation Patterns

### Timestamp Conversions

**For Sessions (AWSDateTime):**
```typescript
// JavaScript Date → GraphQL variable
const startTimestamp = new Date().toISOString();  // "2025-01-01T00:00:00.000Z"
```

**For Events (TimePeriod):**
```typescript
// JavaScript Date → GraphQL variable
const startTimestamp = new Date().getTime().toString();  // "1735689600000"
```

**Displaying timestamps from API:**
```typescript
// Sessions: ISO string
new Date(session.timestamp).toLocaleString();

// Events: Milliseconds as string
new Date(parseInt(event.timestamp)).toLocaleString();

// Telemetry: Milliseconds as string
new Date(parseInt(measurement.timestamp)).toLocaleString();
```

---

### Error Handling for GraphQL

GraphQL returns 200 OK even when queries fail. Check the `errors` field:

```typescript
const response = await fetch(graphqlEndpoint, {
  method: "POST",
  body: JSON.stringify({ query, variables })
});

const result = await response.json();

// ⚠️ Check for GraphQL errors even if HTTP status is 200
if (result.errors) {
  throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
}

return result.data;
```

---

## Authentication Notes

- **All endpoints** require JWT authentication via `Authorization: Bearer <idToken>` header
- Tokens expire - implement refresh logic (5-minute buffer recommended)
- Use the ID token (not access token) for API requests
- REST API uses `idToken`, GraphQL also uses `idToken`

---

## Pagination

Both sessions and events support pagination via `nextToken`:

```typescript
// First request
const response1 = await getEvents(start, end);
console.log(response1.events);  // First batch

// If there are more results
if (response1.nextToken) {
  const response2 = await getEvents(start, end, response1.nextToken);
  console.log(response2.events);  // Next batch
}
```

---

## Development Tips

1. **Test GraphQL queries directly** using the GraphQL endpoint before implementing in code
2. **Log full error responses** - GraphQL validation errors have helpful location information
3. **Start with recent time ranges** (last hour) when testing to minimize response size
4. **Parse stats field immediately** after receiving session data
5. **Use TypeScript strict mode** to catch data structure mismatches early

---

## Quick Reference: Endpoint Types

| Endpoint | Method | Type | Authentication |
|----------|--------|------|----------------|
| `/endpoints` | GET | REST | ❌ None |
| `/auth/token` | POST | REST | ❌ None (credentials in body) |
| `/auth/refresh` | POST | REST | ❌ None (refresh token in body) |
| `/devices` | GET | REST | ✅ ID Token |
| `/data/latest-data` | GET | REST | ✅ ID Token |
| `/data/telemetry-history` | GET | REST | ✅ ID Token |
| Data Service GraphQL | POST | GraphQL | ✅ ID Token |
| Events Service GraphQL | POST | GraphQL | ✅ ID Token |

---

## Version Info

These notes were compiled during implementation in **January 2025** using:
- Next.js 15.5.6
- TypeScript 5.x
- Harvia Cloud API (production endpoints)

API schemas may change - refer to official documentation for the most current information.

---

## Contributing

Found other gotchas or corrections? Add them here with:
- ✅ What works
- ❌ What doesn't work
- 💡 Why it matters
- 📝 Example code

This helps the community avoid the same pitfalls!
