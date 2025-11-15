# Sauna Sensor Dashboard Enhancement Plan

## Overview
Expand the sauna monitoring dashboard to display additional data from the Harvia API including session history, device health metrics, and event alerts.

---

## Backend Changes (API Routes)

### 1. New API Routes

#### `/app/api/sensor/sessions/route.ts`
**Purpose:** Retrieve sauna session history
**Method:** GET
**Query Parameters:**
- `startTimestamp` (optional) - Default: 7 days ago
- `endTimestamp` (optional) - Default: now
- `nextToken` (optional) - Pagination token

**Returns:**
```typescript
{
  sessions: [{
    deviceId: string
    sessionId: string
    timestamp: string
    durationMs: number
    stats: {
      avgTemp?: number
      maxTemp?: number
      avgHum?: number
      // ... other session stats
    }
  }]
  nextToken?: string
}
```

**Implementation:**
- Use GraphQL `devicesSessionsList` query
- Call Harvia Data Service GraphQL endpoint
- Parse and return session data

---

#### `/app/api/sensor/health/route.ts`
**Purpose:** Get device health metrics
**Method:** GET

**Returns:**
```typescript
{
  deviceId: string
  connectionState: {
    connected: boolean
    updatedTimestamp: number
  }
  batteryVoltage?: number
  batteryLoadV?: number
  rssi?: number // WiFi signal strength
  tempEsp?: number // ESP chip temperature
  targetTemp?: number
  saunaStatus?: number
  timeToTarget?: number
}
```

**Implementation:**
- Use existing `getLatestData()` from Harvia client
- Extract health-related fields from sensor data
- Return structured health metrics

---

#### `/app/api/sensor/events/route.ts`
**Purpose:** Retrieve device events and alerts
**Method:** GET
**Query Parameters:**
- `startTimestamp` (optional) - Default: 7 days ago
- `endTimestamp` (optional) - Default: now
- `nextToken` (optional) - Pagination token

**Returns:**
```typescript
{
  events: [{
    deviceId: string
    timestamp: string
    eventId: string
    type: 'SENSOR' | 'GENERIC'
    eventState: 'ACTIVE' | 'INACTIVE'
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    displayName?: string
    sensorName?: string
    sensorValue?: number
  }]
  nextToken?: string
}
```

**Implementation:**
- Use GraphQL `devicesEventsList` query
- Call Harvia Events Service GraphQL endpoint
- Parse and return event data

---

### 2. Update Harvia Client (`lib/harvia-client.ts`)

**Add new methods:**

```typescript
class HarviaClient {
  // ... existing methods ...

  /**
   * Get session history using GraphQL
   */
  async getSessions(
    startTimestamp: string,
    endTimestamp: string,
    nextToken?: string
  ): Promise<SessionsResponse>

  /**
   * Get device events using GraphQL
   */
  async getEvents(
    startTimestamp: string,
    endTimestamp: string,
    nextToken?: string
  ): Promise<EventsResponse>

  /**
   * Execute GraphQL query
   */
  private async graphqlRequest(
    endpoint: string,
    query: string,
    variables: Record<string, unknown>
  ): Promise<unknown>
}
```

**Implementation details:**
- Add GraphQL request method for queries
- Implement session fetching using Data Service GraphQL endpoint
- Implement event fetching using Events Service GraphQL endpoint
- Handle pagination tokens
- Reuse existing authentication/token management

---

### 3. Update Types (`types/sensor.ts`)

**Add new interfaces:**

```typescript
// Session types
export interface Session {
  deviceId: string;
  sessionId: string;
  organizationId: string;
  subId: string;
  timestamp: string;
  type?: string;
  durationMs?: number;
  stats?: Record<string, unknown>;
}

export interface SessionsResponse {
  sessions: Session[];
  nextToken?: string;
}

// Event types
export interface DeviceEvent {
  deviceId: string;
  timestamp: string;
  eventId?: string;
  organizationId?: string;
  updatedTimestamp?: string;
  type?: 'SENSOR' | 'GENERIC';
  eventState?: 'ACTIVE' | 'INACTIVE';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  sensorName?: string;
  sensorValue?: number;
  metadata?: string;
  displayName?: string;
}

export interface EventsResponse {
  events: DeviceEvent[];
  nextToken?: string;
}

// Health metrics type
export interface DeviceHealth {
  deviceId: string;
  connectionState?: {
    connected: boolean;
    updatedTimestamp: number;
  };
  batteryVoltage?: number;
  batteryLoadV?: number;
  rssi?: number;
  tempEsp?: number;
  targetTemp?: number;
  saunaStatus?: number;
  timeToTarget?: number;
  timestamp: string;
}
```

---

## Frontend Changes (UI)

### 1. Update Dashboard Page (`app/sauna/page.tsx`)

**New state variables:**
```typescript
const [sessions, setSessions] = useState<Session[]>([]);
const [deviceHealth, setDeviceHealth] = useState<DeviceHealth | null>(null);
const [events, setEvents] = useState<DeviceEvent[]>([]);
const [showEvents, setShowEvents] = useState(false);
```

**New data fetching:**
- Fetch sessions on mount (last 7 days)
- Fetch device health from SSE updates (extract from sensor data)
- Fetch events on mount (last 7 days)

---

### 2. New UI Components/Sections

#### Session History Section
**Location:** Below the 3 sensor cards, above the chart
**Layout:** Horizontal scrollable cards or table
**Display:**
- Today's sessions vs Last 7 days tabs
- Each session shows:
  - Start time
  - Duration (formatted as HH:MM)
  - Max temperature reached
  - Avg temperature
  - Visual icon/indicator

**Example:**
```
┌─────────────────────────────────────────────────┐
│ Sessions                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 18:30    │ │ 14:20    │ │ Yesterday│         │
│ │ 1h 15m   │ │ 45m      │ │ 2h 00m   │         │
│ │ Max: 85°C│ │ Max: 78°C│ │ Max: 90°C│         │
│ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────┘
```

---

#### Device Health Panel
**Location:** Top right corner or below breadcrumb
**Layout:** Compact info panel
**Display:**
- Battery level (with icon + percentage)
- WiFi signal strength (with icon + bars)
- Connection status (already showing, enhance it)
- ESP temperature (if concerning, show warning)

**Example:**
```
┌─────────────────────────┐
│ Device Health           │
│ 🔋 Battery: 10.5V (95%) │
│ 📶 WiFi: -72 dBm (Good) │
│ 🌡️ ESP: 47°C (Normal)  │
│ ✅ Connected            │
└─────────────────────────┘
```

---

#### Events Timeline Section
**Location:** Below the chart, collapsible
**Layout:** Timeline or list
**Display:**
- Recent events (last 7 days)
- Event severity color coding
- Event type icons
- Expandable to show details
- Filter by severity

**Example:**
```
┌─────────────────────────────────────────────────┐
│ Events & Alerts (3) ▼                           │
│ ┌───────────────────────────────────────┐       │
│ │ 🟡 Device Reconnected - 2h ago        │       │
│ │ 🟢 Session Started - 5h ago           │       │
│ │ 🔴 High Temperature - Yesterday       │       │
│ └───────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## Implementation Order

### Phase 1: Backend (API Routes)
1. ✅ Update types in `types/sensor.ts` - Add Session, Event, DeviceHealth interfaces
2. ✅ Update `lib/harvia-client.ts` - Add GraphQL support and new methods
3. ✅ Create `/app/api/sensor/sessions/route.ts`
4. ✅ Create `/app/api/sensor/health/route.ts`
5. ✅ Create `/app/api/sensor/events/route.ts`
6. ✅ Test all API endpoints

### Phase 2: Frontend (UI)
1. ✅ Add state management for new data
2. ✅ Implement data fetching (sessions, health, events)
3. ✅ Create Device Health Panel component
4. ✅ Create Session History section
5. ✅ Create Events Timeline section
6. ✅ Update existing SSE handler to extract health data
7. ✅ Add loading states and error handling
8. ✅ Polish UI and responsive design

---

## Technical Considerations

### GraphQL Integration
- Harvia API uses AppSync GraphQL
- Need to construct proper GraphQL queries
- Reuse existing JWT authentication
- Handle GraphQL-specific errors

### Data Freshness
- Sessions: Fetch on mount, refresh on manual trigger
- Health: Extract from SSE real-time updates
- Events: Fetch on mount, optionally add to SSE later

### Error Handling
- Graceful degradation if GraphQL endpoints fail
- Show "No data available" states
- Log errors for debugging

### Performance
- Implement pagination for sessions/events if needed
- Consider caching session data (doesn't change frequently)
- Optimize GraphQL queries to request only needed fields

---

## Benefits

1. **Session Tracking** - Users can see their sauna usage patterns
2. **Device Monitoring** - Early warning of battery/connectivity issues
3. **Event Awareness** - Stay informed about device alerts and status changes
4. **Complete Monitoring** - Full visibility into sauna sensor ecosystem

---

## Future Enhancements (Out of Scope)

- Session statistics (weekly/monthly summaries)
- Event notifications (browser push)
- Export session data to CSV
- Session comparison and trends
- Predictive battery replacement alerts
