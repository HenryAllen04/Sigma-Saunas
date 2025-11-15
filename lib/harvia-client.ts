import {
  AuthTokens,
  DeviceListResponse,
  EndpointsConfig,
  LatestDataResponse,
  TelemetryHistoryResponse,
  SessionsResponse,
  EventsResponse,
} from "@/types/sensor";

/**
 * Harvia Sauna API Client
 * Server-side only - uses credentials from environment variables
 */
class HarviaClient {
  private username: string;
  private password: string;
  private endpointsConfig: EndpointsConfig | null = null;
  private idToken: string | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private deviceId: string | null = null;

  constructor() {
    const username = process.env.HARVIA_USERNAME;
    const password = process.env.HARVIA_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "HARVIA_USERNAME and HARVIA_PASSWORD must be set in environment variables"
      );
    }

    this.username = username;
    this.password = password;
  }

  /**
   * Fetch API endpoints configuration
   */
  private async fetchEndpoints(): Promise<void> {
    const response = await fetch("https://prod.api.harvia.io/endpoints");

    if (!response.ok) {
      throw new Error(`Failed to fetch endpoints: ${response.statusText}`);
    }

    this.endpointsConfig = await response.json();
  }

  /**
   * Authenticate and get JWT tokens
   */
  private async authenticate(): Promise<void> {
    if (!this.endpointsConfig) {
      await this.fetchEndpoints();
    }

    const restApiBase =
      this.endpointsConfig!.endpoints.RestApi.generics.https;

    const response = await fetch(`${restApiBase}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const tokens: AuthTokens = await response.json();
    this.idToken = tokens.idToken;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = Date.now() + tokens.expiresIn * 1000;
  }

  /**
   * Refresh JWT tokens if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    // Refresh if token expires in less than 5 minutes
    if (
      !this.tokenExpiry ||
      Date.now() >= this.tokenExpiry - 5 * 60 * 1000
    ) {
      if (!this.refreshToken) {
        await this.authenticate();
        return;
      }

      if (!this.endpointsConfig) {
        await this.fetchEndpoints();
      }

      const restApiBase =
        this.endpointsConfig!.endpoints.RestApi.generics.https;

      const response = await fetch(`${restApiBase}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
          email: this.username,
        }),
      });

      if (!response.ok) {
        // If refresh fails, re-authenticate
        await this.authenticate();
        return;
      }

      const tokens: AuthTokens = await response.json();
      this.idToken = tokens.idToken;
      this.accessToken = tokens.accessToken;
      this.tokenExpiry = Date.now() + tokens.expiresIn * 1000;
    }
  }

  /**
   * Ensure client is initialized and authenticated
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.endpointsConfig) {
      await this.fetchEndpoints();
    }

    if (!this.idToken) {
      await this.authenticate();
    } else {
      await this.refreshTokenIfNeeded();
    }
  }

  /**
   * Get the device ID (fetches first device)
   */
  async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    await this.ensureInitialized();

    const restApiBase =
      this.endpointsConfig!.endpoints.RestApi.device.https;

    const response = await fetch(`${restApiBase}/devices?maxResults=1`, {
      headers: { Authorization: `Bearer ${this.idToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.statusText}`);
    }

    const data: DeviceListResponse = await response.json();

    if (!data.devices || data.devices.length === 0) {
      throw new Error("No devices found");
    }

    this.deviceId = data.devices[0].name;
    return this.deviceId;
  }

  /**
   * Get latest sensor data
   */
  async getLatestData(): Promise<LatestDataResponse> {
    await this.ensureInitialized();
    const deviceId = await this.getDeviceId();

    const restApiBase =
      this.endpointsConfig!.endpoints.RestApi.data.https;

    const response = await fetch(
      `${restApiBase}/data/latest-data?deviceId=${deviceId}&cabinId=C1`,
      {
        headers: { Authorization: `Bearer ${this.idToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch latest data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get telemetry history
   */
  async getTelemetryHistory(
    startTimestamp: string,
    endTimestamp: string,
    samplingMode: string = "average",
    sampleAmount: number = 100
  ): Promise<TelemetryHistoryResponse> {
    await this.ensureInitialized();
    const deviceId = await this.getDeviceId();

    const restApiBase =
      this.endpointsConfig!.endpoints.RestApi.data.https;

    const params = new URLSearchParams({
      deviceId,
      cabinId: "C1",
      startTimestamp,
      endTimestamp,
      samplingMode,
      sampleAmount: sampleAmount.toString(),
    });

    const response = await fetch(
      `${restApiBase}/data/telemetry-history?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.idToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch telemetry history: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Execute GraphQL query
   */
  private async graphqlRequest(
    endpoint: string,
    query: string,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    await this.ensureInitialized();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.idToken}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        `GraphQL errors: ${JSON.stringify(result.errors)}`
      );
    }

    return result.data;
  }

  /**
   * Get session history using GraphQL
   */
  async getSessions(
    startTimestamp: string,
    endTimestamp: string,
    nextToken?: string
  ): Promise<SessionsResponse> {
    const deviceId = await this.getDeviceId();
    const graphqlEndpoint =
      this.endpointsConfig!.endpoints.GraphQL.data.https;

    const query = `
      query DevicesSessionsList(
        $deviceId: String!
        $startTimestamp: AWSDateTime!
        $endTimestamp: AWSDateTime!
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
            organizationId
            subId
            timestamp
            type
            durationMs
            stats
          }
          nextToken
        }
      }
    `;

    const variables: Record<string, unknown> = {
      deviceId,
      startTimestamp,
      endTimestamp,
    };

    if (nextToken) {
      variables.nextToken = nextToken;
    }

    const data = await this.graphqlRequest(graphqlEndpoint, query, variables);
    return (data as { devicesSessionsList: SessionsResponse }).devicesSessionsList;
  }

  /**
   * Get device events using GraphQL
   */
  async getEvents(
    startTimestamp: string,
    endTimestamp: string,
    nextToken?: string
  ): Promise<EventsResponse> {
    const deviceId = await this.getDeviceId();
    const graphqlEndpoint =
      this.endpointsConfig!.endpoints.GraphQL.events.https;

    const query = `
      query DevicesEventsList(
        $deviceId: ID!
        $period: TimePeriod
        $nextToken: ID
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
            organizationId
            updatedTimestamp
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
    `;

    const variables: Record<string, unknown> = {
      deviceId,
      period: {
        startTimestamp: new Date(startTimestamp).getTime().toString(),
        endTimestamp: new Date(endTimestamp).getTime().toString(),
      },
    };

    if (nextToken) {
      variables.nextToken = nextToken;
    }

    const data = await this.graphqlRequest(graphqlEndpoint, query, variables);
    return (data as { devicesEventsList: EventsResponse }).devicesEventsList;
  }
}

// Singleton instance
let harviaClientInstance: HarviaClient | null = null;

/**
 * Get the Harvia client singleton instance
 */
export function getHarviaClient(): HarviaClient {
  if (!harviaClientInstance) {
    harviaClientInstance = new HarviaClient();
  }
  return harviaClientInstance;
}
