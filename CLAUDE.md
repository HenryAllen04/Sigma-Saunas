# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for monitoring Harvia sauna sensors in real-time. It displays sensor data (temperature, humidity, motion), session history, device health metrics, and event alerts through a dashboard interface.

## Development Commands

```bash
# Start development server (runs on port 3010 by default)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

## Environment Setup

Required environment variables (see `.env.example`):
```bash
HARVIA_USERNAME=your-email@example.com
HARVIA_PASSWORD=your-password-here
POLL_INTERVAL=5  # SSE polling interval in seconds
```

## Architecture

### Harvia API Integration

The app uses a **singleton client pattern** (`lib/harvia-client.ts`) to interact with the Harvia Cloud API:

- **Authentication Flow:**
  1. Fetches endpoint configuration from `https://prod.api.harvia.io/endpoints`
  2. Authenticates with username/password to get JWT tokens
  3. Auto-refreshes tokens (5-minute buffer before expiry)
  4. All API routes use `getHarviaClient()` to access the shared instance

- **Supported Protocols:**
  - REST API: Latest data, telemetry history
  - GraphQL: Sessions and events (Data Service & Events Service)
  - See `docs/implementation-notes.md` for GraphQL schema gotchas

### API Routes Architecture

All sensor endpoints follow the pattern `/api/sensor/*`:

| Route | Method | Purpose | Data Source |
|-------|--------|---------|-------------|
| `/api/sensor/current` | GET | Latest sensor reading | REST API |
| `/api/sensor/history` | GET | Last 24h telemetry (default) | REST API |
| `/api/sensor/stream` | GET | SSE stream (5s polling) | REST API |
| `/api/sensor/sessions` | GET | Last 7 days sessions | GraphQL Data Service |
| `/api/sensor/health` | GET | Device health metrics | REST API (extracted) |
| `/api/sensor/events` | GET | Last 7 days events | GraphQL Events Service |

**Important:** Health metrics don't have a dedicated API endpoint - they're extracted from the sensor data response (battery, WiFi RSSI, ESP temperature, etc.).

### Type System

All Harvia API types are defined in `types/sensor.ts`:

- **Data nesting:** Sensor readings are nested inside a `data` field (e.g., `measurement.data.temp`, not `measurement.temp`)
- **Stringified JSON:** Session `stats` field is a JSON string that must be parsed
- **Timestamp formats:** Mixed - ISO strings for sessions, millisecond strings for events/telemetry
- See type definitions for exact structure

### Frontend Pages

**`/sauna`** - Main monitoring dashboard with:
- Real-time sensor cards (temp, humidity, motion) updated via SSE
- Device health panel (battery %, WiFi quality, ESP temp) in header
- Session history cards (last 4 sessions with duration and temps)
- Historical chart (recharts dual-axis: temp left, humidity right)
- Collapsible events timeline (last 10 events with severity badges)

**`/dashboard`** - Generic dashboard template (not sauna-specific)

### State Management Pattern

The sauna page uses independent `useEffect` hooks for each data source:
- SSE stream (`/api/sensor/stream`) → updates sensor data AND device health every 5 seconds
- One-time fetch on mount for: sessions, events, telemetry history
- No global state library - component-level React state

## Key Implementation Details

### GraphQL Quirks

Consult `docs/implementation-notes.md` before modifying GraphQL queries. Key issues:

1. **Sessions:** Use `AWSDateTime!` (not `AWSTimestamp!`) with ISO strings
2. **Events:** Use `ID!` types, wrap timestamps in `period: { startTimestamp, endTimestamp }` object
3. **Optional params:** Don't include undefined `nextToken` - conditionally add to variables object
4. **Error handling:** GraphQL returns 200 OK even on errors - check `result.errors`

### Real-time Updates

The SSE endpoint (`/api/sensor/stream`) polls the Harvia API and:
- Streams sensor data every 5 seconds (configurable via `POLL_INTERVAL`)
- Handles client disconnects gracefully (catches WritableStream errors)
- Frontend auto-reconnects via EventSource error handler

### Helper Functions

When working with sensor data, use these patterns from `app/sauna/page.tsx`:

```typescript
// Duration formatting
formatDuration(durationMs) → "1h 15m"

// WiFi signal quality from RSSI
getWifiQuality(rssi) → { text: "Good", color: "text-yellow-500" }

// Battery percentage (10-11V range)
getBatteryPercentage(voltage) → 53

// Relative event timestamps
formatEventTime(timestamp) → "2h ago"

// Severity color classes
getSeverityColor(severity) → "text-red-500"
```

## Documentation

- `docs/` - Official Harvia API documentation (device, data, events services)
- `docs/implementation-notes.md` - **Community corrections and gotchas** (read this first!)
- `plans/sauna-data.md` - Implementation plan for sessions/health/events features

## shadcn/ui Integration

This project uses shadcn/ui components with the sidebar-08 template:
- Components are in `components/ui/` (auto-generated, don't edit directly)
- Custom composed components: `app-sidebar.tsx`, `nav-*.tsx`
- Theme configured in `tailwind.config.ts` and `app/globals.css`
- Add new components with `npx shadcn@latest add [component]`

## Common Patterns

### Adding a New Sensor Metric

1. Add type to `SensorData` interface in `types/sensor.ts`
2. Client will automatically fetch it via `getLatestData()`
3. Extract in `/api/sensor/health` if it's a health metric
4. Access via `sensorData.data.yourMetric` in the frontend
5. Add UI card/display in `app/sauna/page.tsx`

### Adding a New API Route

1. Create `app/api/sensor/[name]/route.ts`
2. Import `getHarviaClient()` from `lib/harvia-client`
3. Use existing client methods or add new ones to `HarviaClient` class
4. Return `NextResponse.json()` with proper error handling
5. Add corresponding types to `types/sensor.ts`

### Working with Sessions/Events

Both use GraphQL and support pagination:
```typescript
const { sessions, nextToken } = await client.getSessions(start, end);
if (nextToken) {
  const more = await client.getSessions(start, end, nextToken);
}
```

Remember to parse session `stats`: `JSON.parse(session.stats)`



<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design,this creates what users call the "AI slop" aesthetic. Avoid this: make creative,distinctive frontends that surprise and delight. 

Focus on:
- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
