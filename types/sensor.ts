// Harvia API Types

export interface EndpointsConfig {
  endpoints: {
    RestApi: {
      generics: { https: string };
      device: { https: string };
      data: { https: string };
    };
    GraphQL: {
      device: { https: string };
      data: { https: string };
      events: { https: string };
    };
  };
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Device {
  name: string;
  type: string;
  attr: Array<{
    key: string;
    value: string;
  }>;
}

export interface DeviceListResponse {
  devices: Device[];
  nextToken?: string;
}

export interface SensorData {
  temp?: number;
  hum?: number;
  presence?: number;
  timestamp?: string;
  // Include other fields from API response
  heapSize?: number;
  rssi?: number;
  tempEsp?: number;
  targetTemp?: number;
  saunaStatus?: number;
  batteryLoadV?: number;
  resetCnt?: number;
  batteryVoltage?: number;
  timeToTarget?: number;
}

export interface DeviceState {
  deviceId: string;
  shadowName: string;
  desired?: Record<string, unknown>;
  reported?: Record<string, unknown>;
  timestamp: number;
  version: number;
  connectionState?: {
    connected: boolean;
    updatedTimestamp: number;
  };
}

export interface TelemetryMeasurement {
  timestamp: string;
  data: {
    temp?: number;
    hum?: number;
    presence?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TelemetryHistoryResponse {
  measurements: TelemetryMeasurement[];
  nextToken?: string;
}

export interface LatestDataResponse {
  deviceId: string;
  timestamp: string;
  data: SensorData;
}

// Session types
export interface Session {
  deviceId: string;
  sessionId: string;
  organizationId: string;
  subId: string;
  timestamp: string;
  type?: string;
  durationMs?: number;
  stats?: string; // Stringified JSON that must be parsed
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
